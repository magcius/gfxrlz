
// "Hello, Triangle" using the raw, lower-level GfxPlatform API.

import { mat4 } from "gl-matrix";

import { createSwapChainForWebGL2, GfxPlatformWebGL2Config } from "gfxrlz/platform/GfxPlatformWebGL2";
import { GfxSwapChain, GfxDevice, GfxBuffer, GfxInputLayout, GfxInputState, GfxBufferUsage, GfxFormat, GfxVertexBufferFrequency, GfxProgram, GfxClipSpaceNearZ, GfxRenderPass, GfxBindings, GfxBufferFrequencyHint, GfxRenderPipeline, GfxPrimitiveTopology, GfxBindingLayoutDescriptor, GfxRenderTarget } from "gfxrlz/platform/GfxPlatform";
import { projectionMatrixConvertClipSpaceNearZ } from "gfxrlz/helpers/ProjectionHelpers";
import { makeStaticDataBuffer } from "gfxrlz/helpers/BufferHelpers";
import { fillMatrix4x4 } from "gfxrlz/helpers/UniformBufferHelpers";
import { preprocessProgramObj_GLSL } from "gfxrlz/shaderc/GfxShaderCompiler";
import { defaultMegaState } from "gfxrlz/src/gfxrlz/helpers/GfxMegaStateDescriptorHelpers";

class HelloTriangleProgram {
    public static a_Position = 0;
    public static a_Color = 1;

    public static ub_ObjectParams = 0;

    public vert: string = `
layout(std140) uniform ub_ObjectParams {
    Mat4x4 u_ProjectionViewModel;
};

layout(location = ${HelloTriangleProgram.a_Position}) attribute vec3 a_Position;
layout(location = ${HelloTriangleProgram.a_Color}) attribute vec3 a_Color;
out vec3 v_Color;

void main() {
    gl_Position = Mul(u_ProjectionViewModel, vec4(a_Position.xyz, 1.0));
    v_Color = a_Color.rgb;
}
`;

    public frag: string = `
in vec3 v_Color;

void main() {
    gl_FragColor = vec4(v_Color, 1.0);
}
`;
}

class HelloGfxPlatform {
    // Triangle data.
    private vertexBuffer: GfxBuffer;
    private inputLayout: GfxInputLayout;
    private inputState: GfxInputState;

    // Rendering data.
    private program: GfxProgram;
    private bindings: GfxBindings;
    private uniformBuffer: GfxBuffer;
    private renderPipeline: GfxRenderPipeline;

    constructor(private device: GfxDevice) {
        const vertexData = new Float32Array([
            // Top       Red
            0,  1, 0,    1, 0, 0,
            // Left      Green
            -1, -1, 0,    0, 1, 0,
            // Right     Blue
             1, -1, 0,    0, 0, 1,
        ]);

        this.vertexBuffer = makeStaticDataBuffer(device, GfxBufferUsage.Vertex, vertexData.buffer);

        this.inputLayout = this.device.createInputLayout({
            vertexBufferDescriptors: [
                { byteStride: 4 * 6, frequency: GfxVertexBufferFrequency.PerVertex, },
            ],
            vertexAttributeDescriptors: [
                { format: GfxFormat.F32_RGB, bufferIndex: 0, bufferByteOffset: 4 * 0, location: HelloTriangleProgram.a_Position, },
                { format: GfxFormat.F32_RGB, bufferIndex: 0, bufferByteOffset: 4 * 3, location: HelloTriangleProgram.a_Color, },
            ],
            indexBufferFormat: null,
        });

        this.inputState = device.createInputState(this.inputLayout,
            [{ buffer: this.vertexBuffer, byteOffset: 0 }],
            null,
        );

        const bindingLayouts: GfxBindingLayoutDescriptor[] = [
            { numSamplers: 0, numUniformBuffers: 1 },
        ];

        const program = new HelloTriangleProgram();
        this.program = this.device.createProgram(preprocessProgramObj_GLSL(this.device, program));

        this.renderPipeline = this.device.createRenderPipeline({
            topology: GfxPrimitiveTopology.Triangles,
            sampleCount: 1,
            program: this.program,
            bindingLayouts,
            colorAttachmentFormats: [GfxFormat.U8_RGBA_RT],
            depthStencilAttachmentFormat: null,
            inputLayout: this.inputLayout,
            megaStateDescriptor: defaultMegaState,
        });

        // Uniform buffers must always be a multiple of the page size...
        const limits = this.device.queryLimits();
        const uniformBufferPageSize = limits.uniformBufferMaxPageWordSize;
        this.uniformBuffer = this.device.createBuffer(uniformBufferPageSize, GfxBufferUsage.Uniform, GfxBufferFrequencyHint.Dynamic);

        this.bindings = this.device.createBindings({ 
            bindingLayout: bindingLayouts[0],
            samplerBindings: [],
            uniformBufferBindings: [{ buffer: this.uniformBuffer, wordCount: 16 }],
        });
    }

    private _fillInAndUploadUBO(timeInMilliseconds: number): number {
        // Compute matrices.
        const projectionMatrix = mat4.create();
        mat4.ortho(projectionMatrix, -1, 1, -1, 1, -1, 1);

        // Convert to proper clip space (WebGL2 uses -1...1, WebGPU uses 0...1)
        // gl-matrix mat4 uses -1...1 by default.
        const vendorInfo = this.device.queryVendorInfo();
        projectionMatrixConvertClipSpaceNearZ(projectionMatrix, vendorInfo.clipSpaceNearZ, GfxClipSpaceNearZ.NegativeOne);

        const viewMatrix = mat4.create();
        // Zoom out a bit...
        mat4.scale(viewMatrix, viewMatrix, [0.5, 0.5, 0.5]);

        const modelMatrix = mat4.create();
        const rotationY = timeInMilliseconds / 1000;
        mat4.fromYRotation(modelMatrix, rotationY);

        const projectionViewModelMatrix = mat4.create();
        mat4.mul(projectionViewModelMatrix, projectionMatrix, viewMatrix);
        mat4.mul(projectionViewModelMatrix, projectionViewModelMatrix, modelMatrix);

        // Upload to our UBO.
        const limits = this.device.queryLimits();
        const uniformBufferPageSize = limits.uniformBufferMaxPageWordSize;
        const uboData = new Float32Array(uniformBufferPageSize);
        let uboOffs = 0;

        let offs = uboOffs;
        offs += fillMatrix4x4(uboData, offs, projectionViewModelMatrix);

        this.device.uploadBufferData(this.uniformBuffer, 0, new Uint8Array(uboData.buffer));
        return uboOffs;
    }

    public renderToRenderPass(renderPass: GfxRenderPass, timeInMilliseconds: number): void {
        const uboOffs = this._fillInAndUploadUBO(timeInMilliseconds);
        const dynamicBufferOffsets: number[] = [uboOffs];

        renderPass.setPipeline(this.renderPipeline);
        renderPass.setBindings(0, this.bindings, dynamicBufferOffsets);
        renderPass.setInputState(this.inputState);
        renderPass.draw(3, 0);
    }

    public destroy(): void {
        this.device.destroyBuffer(this.vertexBuffer);
        this.device.destroyBuffer(this.uniformBuffer);
    }
}

class Main {
    private device: GfxDevice;
    private helloTriangle: HelloGfxPlatform;
    private renderTarget: GfxRenderTarget;

    constructor(private swapchain: GfxSwapChain) {
        this.device = this.swapchain.getDevice();
        this.helloTriangle = new HelloGfxPlatform(this.device);

        const canvas = this.swapchain.getCanvas();
        this.swapchain.configureSwapChain(canvas.width, canvas.height);
        this.renderTarget = this.device.createRenderTarget({
            pixelFormat: GfxFormat.U8_RGBA_RT,
            width: canvas.width, height: canvas.height, sampleCount: 1,
        });
    }

    public run(): void {
        const renderPass = this.device.createRenderPass({
            colorAttachment: [this.renderTarget],
            colorResolveTo: [this.swapchain.getOnscreenTexture()],
            colorClearColor: [{ r: 0, g: 0, b: 0, a: 1 }],

            depthStencilAttachment: null,
            depthStencilResolveTo: null,
            depthClearValue: 0,
            stencilClearValue: 0,
        });
        const timeInMilliseconds = window.performance.now();
        this.helloTriangle.renderToRenderPass(renderPass, timeInMilliseconds);
        this.device.submitPass(renderPass);

        requestAnimationFrame(() => {
            this.run();
        });
    }

    public destroy(): void {
        this.helloTriangle.destroy();
    }
}

function main(): void {
    const canvas = document.querySelector('#test') as HTMLCanvasElement;
    const gl = canvas.getContext('webgl2', { antialias: false, preserveDrawingBuffer: false });

    if (gl === null) {
        console.error("Welp! Could not initialize WebGL 2");
        return;
    }

    const config = new GfxPlatformWebGL2Config();
    config.shaderDebug = true;
    config.trackResources = true;
    const swapchain = createSwapChainForWebGL2(gl, config);

    const main = new Main(swapchain);
    main.run();
}

window.onload = main;
