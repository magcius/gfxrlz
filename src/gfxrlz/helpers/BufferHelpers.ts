
// Helpers to manage GPU buffer data...

import { GfxBuffer, GfxDevice, GfxBufferUsage, GfxBufferFrequencyHint } from "../platform/GfxPlatform.js";
import { align } from "../platform/GfxPlatformUtil.js";

export function makeStaticDataBuffer(device: GfxDevice, usage: GfxBufferUsage, data: ArrayBufferLike): GfxBuffer {
    return device.createBuffer(align(data.byteLength, 4) / 4, usage, GfxBufferFrequencyHint.Static, new Uint8Array(data));
}
