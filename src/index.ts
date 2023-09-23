import type { Plugin, PluginInitContext, PublicAPI, Query } from "@wox-launcher/wox-plugin"
import { obsidian } from "./obsidian" // eslint-disable-next-line @typescript-eslint/ban-ts-comment

let api: PublicAPI

export const plugin: Plugin = {
  init: async (context: PluginInitContext) => {
    api = context.API
    await obsidian.init(api)
  },

  query: async (query: Query) => {
    return obsidian.query(query)
  }
}
