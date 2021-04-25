
import { GfxBuffer, GfxBufferFrequencyHint, GfxBufferUsage, GfxDevice } from "../platform/GfxPlatform";
import { align } from "../platform/GfxPlatformUtil";

export function makeStaticDataBuffer(device: GfxDevice, usage: GfxBufferUsage, data: ArrayBufferLike): GfxBuffer {
    const gfxBuffer = device.createBuffer(align(data.byteLength, 4) / 4, usage, GfxBufferFrequencyHint.Static);
    device.uploadBufferData(gfxBuffer, 0, new Uint8Array(data));
    return gfxBuffer;
}
