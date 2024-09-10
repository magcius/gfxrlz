
import { GfxDevice } from "../platform/GfxPlatform.js";
import { GfxRenderCache } from "./GfxRenderCache.js";
import { GfxRenderDynamicUniformBuffer } from "./GfxRenderDynamicUniformBuffer.js";
import { GfxRenderInst, GfxRenderInstManager } from "./GfxRenderInstManager.js";
import { GfxrRenderGraph, GfxrRenderGraphImpl } from "./GfxRenderGraph.js";
import { DebugThumbnailDrawer, TextDrawer } from "../helpers/DebugThumbnailHelpers.js";
import { DebugDraw } from "../helpers/DebugDraw.js";

export class GfxRenderHelper {
    public renderCache: GfxRenderCache;
    public renderGraph: GfxrRenderGraph;
    public renderInstManager: GfxRenderInstManager;
    public uniformBuffer: GfxRenderDynamicUniformBuffer;
    public debugThumbnails: DebugThumbnailDrawer;
    public debugDraw: DebugDraw;

    private renderCacheOwn: GfxRenderCache | null = null;

    constructor(public device: GfxDevice, renderCache: GfxRenderCache | null = null) {
        if (renderCache === null) {
            this.renderCacheOwn = new GfxRenderCache(device);
            this.renderCache = this.renderCacheOwn;
        } else {
            this.renderCache = renderCache;
        }

        this.renderGraph = new GfxrRenderGraphImpl(this.device);
        this.renderInstManager = new GfxRenderInstManager(this.renderCache);
        this.uniformBuffer = new GfxRenderDynamicUniformBuffer(this.device);
        this.debugDraw = new DebugDraw(this.renderCache, this.uniformBuffer);
        this.debugThumbnails = new DebugThumbnailDrawer(this);
    }

    public pushTemplateRenderInst(): GfxRenderInst {
        const template = this.renderInstManager.pushTemplateRenderInst();
        template.setUniformBuffer(this.uniformBuffer);
        return template;
    }

    public prepareToRender(): void {
        this.renderCache.prepareToRender();
        this.uniformBuffer.prepareToRender();
    }

    public destroy(): void {
        if (this.renderCacheOwn !== null)
            this.renderCacheOwn.destroy();
        this.uniformBuffer.destroy();
        this.renderGraph.destroy();
        this.debugDraw.destroy();
    }

    public getDebugTextDrawer(): TextDrawer | null {
        return null;
    }
}
