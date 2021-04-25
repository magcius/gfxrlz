
import { GfxDevice } from "../platform/GfxPlatform";
import { GfxRenderCache } from "./GfxRenderCache";
import { GfxRenderDynamicUniformBuffer } from "./GfxRenderDynamicUniformBuffer";
import { GfxRenderInst, GfxRenderInstManager } from "./GfxRenderInstManager";
import { GfxrRenderGraph, GfxrRenderGraphImpl } from "./GfxRenderGraph";

export class GfxRenderHelper {
    public uniformBuffer: GfxRenderDynamicUniformBuffer;
    public renderInstManager: GfxRenderInstManager;
    public renderCache: GfxRenderCache;
    public renderGraph: GfxrRenderGraph = new GfxrRenderGraphImpl();

    constructor(public device: GfxDevice, renderCache: GfxRenderCache | null = null) {
        this.renderCache = renderCache !== null ? renderCache : new GfxRenderCache(this.device);
        this.renderInstManager = new GfxRenderInstManager(this.device, this.renderCache);
        this.uniformBuffer = new GfxRenderDynamicUniformBuffer(this.device);
    }

    public pushTemplateRenderInst(): GfxRenderInst {
        const template = this.renderInstManager.pushTemplateRenderInst();
        template.setUniformBuffer(this.uniformBuffer);
        return template;
    }

    public prepareToRender(): void {
        this.uniformBuffer.prepareToRender(this.device);
    }

    public destroy(): void {
        this.uniformBuffer.destroy(this.device);
        this.renderInstManager.destroy();
        this.renderCache.destroy();
        this.renderGraph.destroy(this.device);
    }
}
