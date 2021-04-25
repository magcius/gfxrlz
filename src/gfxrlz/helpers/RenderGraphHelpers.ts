
import { GfxRenderPassDescriptor, GfxColor, GfxFormat } from "../platform/GfxPlatform";
import { reverseDepthForClearValue } from "./ReversedDepthHelpers";
import { GfxrAttachmentSlot, GfxrRenderTargetDescription } from "../render/GfxRenderGraph";

export function makeClearRenderPassDescriptor(clearColor: Readonly<GfxColor> | 'load'): GfxRenderPassDescriptor {
    return {
        colorAttachment: null,
        colorResolveTo: null,
        depthStencilAttachment: null,
        colorClearColor: clearColor,
        depthStencilResolveTo: null,
        depthClearValue: reverseDepthForClearValue(1.0),
        stencilClearValue: 0.0,
    }
}

export const enum AntialiasingMode {
    None, FXAA, MSAAx4,
}

interface RenderInput {
    backbufferWidth: number;
    backbufferHeight: number;
    antialiasingMode: AntialiasingMode;
}

function selectFormatSimple(slot: GfxrAttachmentSlot): GfxFormat {
    if (slot === GfxrAttachmentSlot.Color0)
        return GfxFormat.U8_RGBA_RT;
    else if (slot === GfxrAttachmentSlot.DepthStencil)
        return GfxFormat.D32F;
    else
        throw "whoops";
}

function selectSampleCount(renderInput: RenderInput): number {
    if (renderInput.antialiasingMode === AntialiasingMode.MSAAx4)
        return 4;
    else
        return 1;
}

export function setBackbufferDescSimple(desc: GfxrRenderTargetDescription, renderInput: RenderInput): void {
    const sampleCount = selectSampleCount(renderInput);
    desc.setDimensions(renderInput.backbufferWidth, renderInput.backbufferHeight, sampleCount);
}

export function makeBackbufferDescSimple(slot: GfxrAttachmentSlot, renderInput: RenderInput, clearDescriptor: GfxRenderPassDescriptor): GfxrRenderTargetDescription {
    const pixelFormat = selectFormatSimple(slot);
    const desc = new GfxrRenderTargetDescription(pixelFormat);

    setBackbufferDescSimple(desc, renderInput);

    if (clearDescriptor !== null) {
        desc.colorClearColor = clearDescriptor.colorClearColor;
        desc.depthClearValue = clearDescriptor.depthClearValue;
        desc.stencilClearValue = clearDescriptor.stencilClearValue;
    }

    return desc;
}
