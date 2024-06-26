import * as path from "path"
import { resolve } from "path"
import { Context, PublicAPI, Query, Result, WoxImage, WoxPreview } from "@wox-launcher/wox-plugin"
import os from "os"
import * as fs from "fs/promises"
import PinyinMatch from "pinyin-match"
import open from "open"

export interface VaultFile {
  path: string
  name: string
  vault: string
}

let api: PublicAPI
let files: VaultFile[] = []

async function getFilesRecursive(dir: string): Promise<string[]> {
  const dirEnts = await fs.readdir(dir, { withFileTypes: true })
  const files: Awaited<string[] | string>[] = await Promise.all(
    dirEnts.map(dirent => {
      const res = resolve(dir, dirent.name)
      return dirent.isDirectory() ? getFilesRecursive(res) : res
    })
  )
  return Array.prototype.concat(...files)
}

async function getVaultPaths(ctx: Context) {
  const vaults: string[] = []
  let obsidianConfigPath = ""
  if (process.platform === "win32") {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    obsidianConfigPath = path.join(process.env.APPDATA, "obsidian", "obsidian.json")
  }
  if (process.platform === "darwin") {
    obsidianConfigPath = path.join(os.homedir(), "Library", "Application Support", "obsidian", "obsidian.json")
  }
  if (obsidianConfigPath == "") {
    await api.Log(ctx, "Error", `Unsupported platform: ${process.platform}`)
    return
  }

  await api.Log(ctx, "Info", `Obsidian config path: ${obsidianConfigPath}`)
  //read config
  const config = await fs.readFile(obsidianConfigPath, "utf8")
  const configJson = JSON.parse(config)
  //get vaults
  for (const key of Object.keys(configJson["vaults"])) {
    const vaultPath = configJson["vaults"][key]["path"]
    vaults.push(vaultPath)
  }

  return vaults
}

async function indexVaults(ctx: Context) {
  files = []
  const vaults = await getVaultPaths(ctx)
  if (vaults === undefined) {
    return
  }

  for (const vaultPath of vaults) {
    const filesInVault = await getFilesRecursive(vaultPath)
    for (const file of filesInVault) {
      files.push({
        path: file,
        name: path.basename(file),
        vault: path.basename(vaultPath)
      })
    }
  }

  await api.Log(ctx, "Info", `Indexed ${files.length} files`)
}

export const obsidian = {
  init: async (ctx: Context, publicAPI: PublicAPI) => {
    api = publicAPI
    await indexVaults(ctx)
  },
  query: async (ctx: Context, query: Query): Promise<Result[]> => {
    if (query.Search === "") {
      return []
    }

    const results: Result[] = []
    for (const file of files) {
      const matchResult = PinyinMatch.match(file.name, query.Search)
      if (matchResult === false) {
        continue
      }

      results.push({
        Title: file.name,
        SubTitle: file.path,
        Icon: { ImageType: "relative", ImageData: "images/app.png" } as WoxImage,
        Preview: {
          PreviewType: "file",
          PreviewData: `${file.path}`,
          PreviewProperties: {}
        } as WoxPreview,
        Actions: [
          {
            Name: "Open",
            Action: async () => {
              const url = `obsidian://open?vault=${encodeURIComponent(file.vault)}&file=${encodeURIComponent(file.name)}`
              await api.Log(ctx, "Info", `Opening ${url}`)
              await open(url)
            }
          }
        ]
      })
    }
    return results
  }
}
