import { defineConfig, type PluginOption, type ResolvedConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { join, relative, resolve, sep } from 'path'
import { cpSync, rmSync, linkSync, readdirSync, statSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { randomBytes } from 'crypto'
import { zipSync, type Zippable } from 'fflate'
import manifestJson from './manifest.json'
import packageJson from './package.json'
import { locales } from './src/i18n/locales'
import ManifestV3 = chrome.runtime.ManifestV3

const distDir = resolve(__dirname, 'dist')
const distChromeDir = join(distDir, 'chrome')
const distFireFoxDir = join(distDir, 'firefox')
const srcDir = resolve(__dirname, 'src')
const entrypointDir = join(srcDir, 'entrypoints')
const staticDir = resolve(__dirname, 'static')

const injectFileName = 'inject.js'
const uniqueHeaderKeyName = randomAlphabetic(8)
const storedZipExts = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif', '.ico', '.woff', '.woff2', '.zip', '.gz', '.br', '.mp3', '.mp4', '.webm', '.pdf'])

const outputBanner = `
/**
 * Bullshield
 * https://github.com/jarczakpawel/bullshield-browser
 * Issues: https://github.com/jarczakpawel/bullshield-browser/issues/new/choose
 */`.trim()

function randomAlphabetic(length: number): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const bytes = randomBytes(length)
  let result = ''

  for (let i = 0; i < length; i++) {
    result += alphabet[bytes[i] % alphabet.length]
  }

  return result
}

function toZipPath(path: string): string {
  return path.split(sep).join('/')
}

function shouldStoreWithoutCompression(path: string): boolean {
  const dotIndex = path.lastIndexOf('.')
  return dotIndex !== -1 && storedZipExts.has(path.slice(dotIndex).toLowerCase())
}

function collectZipEntries(rootDir: string): Zippable {
  const entries: Zippable = {}

  const walk = (dir: string): void => {
    for (const file of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const absPath = join(dir, file.name)

      if (file.isDirectory()) {
        walk(absPath)
        continue
      }

      if (!file.isFile() && !file.isSymbolicLink()) {
        continue
      }

      const zipPath = toZipPath(relative(rootDir, absPath))
      const level = shouldStoreWithoutCompression(zipPath) ? 0 : 9
      entries[zipPath] = [readFileSync(absPath), { level }]
    }
  }

  walk(rootDir)

  return entries
}

function writeZipFromDir(rootDir: string, outFile: string): void {
  writeFileSync(outFile, Buffer.from(zipSync(collectZipEntries(rootDir), { level: 9 })))
}

/** Create _locales directory with messages.json files */
const createLocalesPlugin: PluginOption = {
  name: 'create-locale-files',
  generateBundle() {
    for (const locale in locales) {
      const name = locale as keyof typeof locales
      const data = locales[name]
      const result: Record<string, { message: string }> = {}

      for (const key in data) {
        result[key] = { message: data[key as keyof typeof data] }
      }

      const dirPath = join(distChromeDir, '_locales', name)

      mkdirSync(dirPath, { recursive: true })
      writeFileSync(join(dirPath, 'messages.json'), JSON.stringify(result), { flag: 'w' })
    }
  },
}

/** Copy static content as is */
const copyStaticContentAsIsPlugin: PluginOption = {
  name: 'copy-static-content',
  generateBundle() {
    cpSync(staticDir, distChromeDir, { recursive: true })
  },
}

/** Split dist into chrome and firefox */
const splitChromeAndFirefoxPlugin: PluginOption = {
  name: 'split-chrome-and-firefox',
  writeBundle: {
    sequential: true,
    handler() {
      rmSync(distFireFoxDir, { recursive: true, force: true })
      mkdirSync(distFireFoxDir, { recursive: true })

      const mirror = (from: string, to: string): void => {
        readdirSync(from, { withFileTypes: true })
          .sort()
          .forEach((file) => {
            if (file.name === 'manifest.json') {
              return
            }

            const fromPath = join(from, file.name)
            const toPath = join(to, file.name)
            const stat = statSync(fromPath)

            if (stat.isDirectory()) {
              mkdirSync(toPath, { recursive: true })
              mirror(fromPath, toPath)
            } else if (stat.isFile() || stat.isSymbolicLink()) {
              linkSync(fromPath, toPath)
            }
          })
      }

      mirror(distChromeDir, distFireFoxDir)
    },
  },
}

/** Create manifest.json file with version from package.json (including other changes) */
const copyAndModifyManifestPlugin: PluginOption = {
  name: 'copy-and-modify-manifest',
  writeBundle: {
    sequential: true,
    handler() {
      const content: Partial<Omit<ManifestV3, 'version'> & { version: string }> = {
        ...manifestJson,
      }

      for (const key in content) {
        if (key.startsWith('$')) {
          delete content[key as keyof typeof content]
        }
      }

      content.version = packageJson.version
      content.web_accessible_resources = [{ resources: [`/${injectFileName}`], matches: ['<all_urls>'] }]

      writeFileSync(join(distChromeDir, 'manifest.json'), JSON.stringify(content), { flag: 'w' })

      writeFileSync(
        join(distFireFoxDir, 'manifest.json'),
        JSON.stringify({
          ...content,
          permissions: (content.permissions || []).filter((permission: string) => permission !== 'debugger'),
          background: { scripts: [content.background.service_worker], type: content.background.type },
          browser_specific_settings: {
            gecko: { strict_min_version: '113.0' },
            gecko_android: { strict_min_version: '120.0' },
          },
        }),
        { flag: 'w' }
      )
    },
  },
}

/** Create dist.zip file */
const zipDistPlugin = (): PluginOption => {
  let config: ResolvedConfig

  return {
    name: 'zip-dist',
    configResolved(cfg) {
      config = cfg
    },
    writeBundle: {
      sequential: true,
      handler() {
        if (config.command !== 'build' || process.argv.includes('--watch')) {
          return
        }

        writeZipFromDir(distChromeDir, resolve(distDir, 'chrome.zip'))
        writeZipFromDir(distFireFoxDir, resolve(distDir, 'firefox.zip'))
      },
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    [createLocalesPlugin, copyStaticContentAsIsPlugin],
    splitChromeAndFirefoxPlugin,
    [copyAndModifyManifestPlugin, zipDistPlugin()],
  ],
  resolve: {
    alias: {
      '~': srcDir,
    },
  },
  define: {
    __UNIQUE_INJECT_FILENAME__: JSON.stringify(injectFileName),
    __UNIQUE_HEADER_KEY_NAME__: JSON.stringify(uniqueHeaderKeyName),

  },
  root: entrypointDir,
  assetsInclude: 'public/**/*',
  build: {
    outDir: distChromeDir,
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: join(entrypointDir, 'popup', 'index.html'),
        options: join(entrypointDir, 'options', 'index.html'),
        onboard: join(entrypointDir, 'onboard', 'index.html'),
        background: join(entrypointDir, 'background', 'index.ts'),
        content: join(entrypointDir, 'content', 'content.ts'),
        inject: join(entrypointDir, 'content', 'inject.ts'),
      },
      output: {
        banner: outputBanner,
        entryFileNames: '[name].js',
        chunkFileNames: 'js/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
    sourcemap: process.argv.includes('--watch'),
  },
  // @ts-ignore-next-line The `vite` type definitions are not up-to-date
  test: {
    root: __dirname,
  },
})
