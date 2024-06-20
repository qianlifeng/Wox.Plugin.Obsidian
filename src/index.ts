import { Context, Plugin, PluginInitParams, PublicAPI, Query } from "@wox-launcher/wox-plugin"
import { obsidian } from "./obsidian"

let api: PublicAPI

export const plugin: Plugin = {
  init: async (ctx: Context, initParams: PluginInitParams) => {
    api = initParams.API
    await obsidian.init(ctx, api)
  },

  query: async (ctx: Context, query: Query) => {
    return obsidian.query(ctx, query)
  }
}
