
import { GfxColor, GfxFormat } from "../platform/GfxPlatform.js";
import { reverseDepthForClearValue } from "./ReversedDepthHelpers.js";
import { GfxrAttachmentClearDescriptor, GfxrAttachmentSlot, GfxrRenderTargetDescription } from "../render/GfxRenderGraph.js";

export function makeAttachmentClearDescriptor(clearColor: Readonly<GfxColor> | 'load'): GfxrAttachmentClearDescriptor {
    return {
        clearColor: clearColor,
        clearDepth: reverseDepthForClearValue(1.0),
        clearStencil: 0.0,
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
        return GfxFormat.D24;
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

export function makeBackbufferDescSimple(slot: GfxrAttachmentSlot, renderInput: RenderInput, clearDescriptor: GfxrAttachmentClearDescriptor): GfxrRenderTargetDescription {
    const pixelFormat = selectFormatSimple(slot);
    const desc = new GfxrRenderTargetDescription(pixelFormat);

    setBackbufferDescSimple(desc, renderInput);

    if (clearDescriptor !== null) {
        desc.clearColor = clearDescriptor.clearColor;
        desc.clearDepth = clearDescriptor.clearDepth;
        desc.clearStencil = clearDescriptor.clearStencil;
    }

    return desc;
}
