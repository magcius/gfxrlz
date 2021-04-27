
import { GfxDevice } from "../platform/GfxPlatform";
import { GfxRenderCache } from "./GfxRenderCache";
import { GfxRenderDynamicUniformBuffer } from "./GfxRenderDynamicUniformBuffer";
import { GfxRenderInst, GfxRenderInstManager } from "./GfxRenderInstManager";
import { GfxrRenderGraph, GfxrRenderGraphImpl } from "./GfxRenderGraph";
import { DebugThumbnailDrawer, TextDrawer } from "../helpers/DebugThumbnailHelpers";

export class GfxRenderHelper {
    public renderCache: GfxRenderCache;
    public renderGraph: GfxrRenderGraph;
    public renderInstManager: GfxRenderInstManager;
    public uniformBuffer: GfxRenderDynamicUniformBuffer;
    public debugThumbnails: DebugThumbnailDrawer;

    constructor(public device: GfxDevice, renderCache: GfxRenderCache | null = null) {
        this.renderCache = renderCache !== null ? renderCache : new GfxRenderCache(device);
        this.renderGraph = new GfxrRenderGraphImpl(this.device);
        this.renderInstManager = new GfxRenderInstManager(this.renderCache);
        this.uniformBuffer = new GfxRenderDynamicUniformBuffer(this.device);
        this.debugThumbnails = new DebugThumbnailDrawer(this);
    }

    public pushTemplateRenderInst(): GfxRenderInst {
        const template = this.renderInstManager.pushTemplateRenderInst();
        template.setUniformBuffer(this.uniformBuffer);
        return template;
    }

    public prepareToRender(): void {
        this.uniformBuffer.prepareToRender();
    }

    public destroy(): void {
        this.uniformBuffer.destroy();
        this.renderInstManager.destroy();
        this.renderCache.destroy();
        this.renderGraph.destroy();
    }

    public getDebugTextDrawer(): TextDrawer | null {
        return null;
    }

    public getCache(): GfxRenderCache {
        return this.renderCache;
    }
}
