
# gfxrlz

A modern-styled, low-level graphics API for the web.

## Components

* GfxPlatform: A modern-API-inspired, minimally-opinionated platform layer that supports both rendering to WebGL 2 and WebGPU.
* GfxRenderInstManager: A higher-level toolkit for managing and sorting lists of piecemeal, context-free draw call structures.
* GfxRenderGraph: A render graph to support postprocessing operations.

gfxrlz is the rendering API used by [noclip.website](https://noclip.website), which implements a diverse set of complex renderers for different games, in all sorts of different styles. As such, gfxrlz is designed to be an extremely flexible toolkit.