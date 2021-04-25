
// "Hello, Triangle" using the higher-level GfxRenderer API.

import { mat4 } from "gl-matrix";

import { createSwapChainForWebGL2, GfxPlatformWebGL2Config } from "gfxrlz/platform/GfxPlatformWebGL2";
import { GfxSwapChain, GfxDevice, GfxBuffer, GfxInputLayout, GfxInputState, GfxBufferUsage, GfxFormat, GfxVertexBufferFrequency, GfxProgram, GfxClipSpaceNearZ, GfxRenderPass, GfxBindings, GfxBufferFrequencyHint, GfxRenderPipeline, GfxPrimitiveTopology, GfxBindingLayoutDescriptor, GfxRenderTarget } from "gfxrlz/platform/GfxPlatform";
import { projectionMatrixConvertClipSpaceNearZ } from "gfxrlz/helpers/ProjectionHelpers";
import { GfxRenderCache } from "gfxrlz/render/GfxRenderCache";
import { GfxRenderHelper } from "gfxrlz/render/GfxRenderHelper";
import { GfxRendererLayer, GfxRenderInst, GfxRenderInstManager, makeSortKeyOpaque } from "gfxrlz/render/GfxRenderInstManager";
import { makeStaticDataBuffer } from "gfxrlz/helpers/BufferHelpers";
import { fillMatrix4x4 } from "gfxrlz/helpers/UniformBufferHelpers";
import { preprocessProgramObj_GLSL } from "gfxrlz/shaderc/GfxShaderCompiler";
import { GfxrAttachmentSlot, GfxrRenderTargetDescription } from "gfxrlz/src/gfxrlz/render/GfxRenderGraph";

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

class HelloGfxRenderer {
    // Triangle data.
    private vertexBuffer: GfxBuffer;
    private inputLayout: GfxInputLayout;
    private inputState: GfxInputState;

    // Rendering data.
    private program: GfxProgram;

    constructor(private device: GfxDevice, cache: GfxRenderCache) {
        const vertexData = new Float32Array([
            // Top       Red
            0,  1, 0,    1, 0, 0,
            // Left      Green
            -1, -1, 0,    0, 1, 0,
            // Right     Blue
             1, -1, 0,    0, 0, 1,
        ]);

        this.vertexBuffer = makeStaticDataBuffer(device, GfxBufferUsage.Vertex, vertexData.buffer);

        this.inputLayout = cache.createInputLayout({
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

        const program = new HelloTriangleProgram();
        this.program = cache.createProgramSimple(preprocessProgramObj_GLSL(device, program));
    }

    private _fillInAndUploadUBO(renderInst: GfxRenderInst, timeInMilliseconds: number): void {
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
        let offs = renderInst.allocateUniformBuffer(HelloTriangleProgram.ub_ObjectParams, 16);
        const d = renderInst.mapUniformBufferF32(HelloTriangleProgram.ub_ObjectParams);

        offs += fillMatrix4x4(d, offs, projectionViewModelMatrix);
    }

    public renderToRenderInstManager(renderInstManager: GfxRenderInstManager, timeInMilliseconds: number): void {
        const renderInst = renderInstManager.newRenderInst();

        const bindingLayouts: GfxBindingLayoutDescriptor[] = [
            { numSamplers: 0, numUniformBuffers: 1 },
        ];
        renderInst.setBindingLayouts(bindingLayouts);

        renderInst.setGfxProgram(this.program);
        renderInst.setInputLayoutAndState(this.inputLayout, this.inputState);
        this._fillInAndUploadUBO(renderInst, timeInMilliseconds);
        renderInst.drawPrimitives(3);

        // Set the sort key, if desired.
        renderInst.sortKey = makeSortKeyOpaque(GfxRendererLayer.OPAQUE, this.program.ResourceUniqueId);

        // Submit the render inst to the global list.
        renderInstManager.submitRenderInst(renderInst);
    }

    public destroy(): void {
        this.device.destroyBuffer(this.vertexBuffer);
    }
}

class Main {
    private device: GfxDevice;
    private renderHelper: GfxRenderHelper;
    private helloTriangle: HelloGfxRenderer;

    constructor(private swapchain: GfxSwapChain) {
        this.device = this.swapchain.getDevice();
        this.renderHelper = new GfxRenderHelper(this.device);
        this.helloTriangle = new HelloGfxRenderer(this.device, this.renderHelper.renderCache);

        const canvas = this.swapchain.getCanvas();
        this.swapchain.configureSwapChain(canvas.width, canvas.height);

        this.renderHelper = new GfxRenderHelper(this.device);
    }

    public run(): void {
        const canvas = this.swapchain.getCanvas();
        const builder = this.renderHelper.renderGraph.newGraphBuilder();

        // First, use GfxRenderInstManager to build our draw call collection...

        // Push our outer template, which contains the dynamic UBO bindings...
        this.renderHelper.pushTemplateRenderInst();
        const renderInstManager = this.renderHelper.renderInstManager;

        const timeInMilliseconds = window.performance.now();
        this.helloTriangle.renderToRenderInstManager(renderInstManager, timeInMilliseconds);

        renderInstManager.popTemplateRenderInst();

        // Use the render graph to schedule our passes...
        const renderTarget = new GfxrRenderTargetDescription(GfxFormat.U8_RGBA_RT);
        renderTarget.colorClearColor = { r: 0, g: 0, b: 0, a: 1 };
        renderTarget.setDimensions(canvas.width, canvas.height, 1);

        const renderTargetID = builder.createRenderTargetID(renderTarget, 'Main Render Target');
        builder.pushPass((pass) => {
            pass.setDebugName('Main Render Pass');
            pass.attachRenderTargetID(GfxrAttachmentSlot.Color0, renderTargetID);

            pass.exec((passRenderer) => {
                renderInstManager.drawOnPassRenderer(this.device, passRenderer);
            });
        });
        // Push postprocessing passes, if desired...
        builder.resolveRenderTargetToExternalTexture(renderTargetID, this.swapchain.getOnscreenTexture());

        // Upload the uniform buffer data.
        this.renderHelper.prepareToRender();

        // Schedule & run the render graph that we built above.
        this.renderHelper.renderGraph.execute(builder);

        // Reset the render inst manager.
        renderInstManager.resetRenderInsts();

        requestAnimationFrame(() => {
            this.run();
        });
    }

    public destroy(): void {
        this.renderHelper.destroy();
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
