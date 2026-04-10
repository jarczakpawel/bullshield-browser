import type { ReadonlyUserAgentState } from '~/shared/types'
import { architectureFor, platformVersionFor, bitnessFor } from '~/shared/fingerprint/ua-ch'

type FingerprintProfile = NonNullable<ReadonlyUserAgentState['fingerprint']>

type ScreenPreset = FingerprintProfile['screen']

type WebGLPreset = FingerprintProfile['webgl']

type GPUPreset = FingerprintProfile['gpu']

type MediaDevicePreset = FingerprintProfile['mediaDevices'][number]

const hashString = (value: string): number => {
  let h = 2166136261

  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }

  return h >>> 0
}

const pick = <T>(list: readonly T[], seed: number, salt: number = 0): T => {
  return list[(seed + salt) % list.length]
}

const shortId = (value: string): string => hashString(value).toString(16).padStart(8, '0')

const androidMobileScreens: readonly ScreenPreset[] = [
{ width: 320, height: 568, availWidth: 320, availHeight: 544, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
{ width: 360, height: 640, availWidth: 360, availHeight: 616, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3 },
{ width: 360, height: 720, availWidth: 360, availHeight: 696, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2.5 },
{ width: 360, height: 780, availWidth: 360, availHeight: 756, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3 },
{ width: 360, height: 800, availWidth: 360, availHeight: 776, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3 },
{ width: 384, height: 832, availWidth: 384, availHeight: 808, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3.5 },
{ width: 390, height: 844, availWidth: 390, availHeight: 820, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3 },
{ width: 393, height: 852, availWidth: 393, availHeight: 828, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3 },
{ width: 393, height: 873, availWidth: 393, availHeight: 849, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2.75 },
{ width: 412, height: 892, availWidth: 412, availHeight: 868, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3.5 },
{ width: 412, height: 915, availWidth: 412, availHeight: 891, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2.625 },
{ width: 430, height: 932, availWidth: 430, availHeight: 908, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3 },
{ width: 432, height: 960, availWidth: 432, availHeight: 936, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3.3333333333 },
{ width: 444, height: 986, availWidth: 444, availHeight: 962, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2.75 },
{ width: 448, height: 998, availWidth: 448, availHeight: 974, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3 },
{ width: 450, height: 1000, availWidth: 450, availHeight: 976, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3.2 },
{ width: 360, height: 804, availWidth: 360, availHeight: 780, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3 },
{ width: 360, height: 806, availWidth: 360, availHeight: 782, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3 },
{ width: 384, height: 854, availWidth: 384, availHeight: 830, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2.8125 },
{ width: 412, height: 869, availWidth: 412, availHeight: 845, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3 },
{ width: 480, height: 1067, availWidth: 480, availHeight: 1043, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2.25 },
{ width: 540, height: 1200, availWidth: 540, availHeight: 1176, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
{ width: 600, height: 1320, availWidth: 600, availHeight: 1296, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },

]

const androidTabletScreens: readonly ScreenPreset[] = [
{ width: 800, height: 1280, availWidth: 800, availHeight: 1240, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
{ width: 834, height: 1194, availWidth: 834, availHeight: 1154, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
{ width: 875, height: 1400, availWidth: 875, availHeight: 1360, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
{ width: 900, height: 1440, availWidth: 900, availHeight: 1400, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
{ width: 962, height: 1440, availWidth: 962, availHeight: 1400, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
{ width: 1024, height: 1366, availWidth: 1024, availHeight: 1326, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
{ width: 1032, height: 1376, availWidth: 1032, availHeight: 1336, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
{ width: 1067, height: 1600, availWidth: 1067, availHeight: 1552, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
{ width: 768, height: 1024, availWidth: 768, availHeight: 984, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
{ width: 820, height: 1280, availWidth: 820, availHeight: 1240, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
{ width: 900, height: 1600, availWidth: 900, availHeight: 1552, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
{ width: 960, height: 1600, availWidth: 960, availHeight: 1552, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
{ width: 1280, height: 800, availWidth: 1280, availHeight: 760, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 1.5 },

]

const iosPhoneScreens: readonly ScreenPreset[] = [
{ width: 320, height: 568, availWidth: 320, availHeight: 548, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
{ width: 375, height: 667, availWidth: 375, availHeight: 647, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
{ width: 375, height: 812, availWidth: 375, availHeight: 792, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3 },
{ width: 390, height: 844, availWidth: 390, availHeight: 824, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3 },
{ width: 393, height: 852, availWidth: 393, availHeight: 832, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3 },
{ width: 402, height: 874, availWidth: 402, availHeight: 854, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3 },
{ width: 414, height: 896, availWidth: 414, availHeight: 876, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
{ width: 414, height: 896, availWidth: 414, availHeight: 876, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3 },
{ width: 428, height: 926, availWidth: 428, availHeight: 906, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3 },
{ width: 430, height: 932, availWidth: 430, availHeight: 912, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3 },
{ width: 440, height: 956, availWidth: 440, availHeight: 936, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3 },
{ width: 414, height: 736, availWidth: 414, availHeight: 716, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3 },

]

const iosTabletScreens: readonly ScreenPreset[] = [
{ width: 744, height: 1133, availWidth: 744, availHeight: 1093, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
{ width: 768, height: 1024, availWidth: 768, availHeight: 984, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
{ width: 810, height: 1080, availWidth: 810, availHeight: 1040, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
{ width: 820, height: 1180, availWidth: 820, availHeight: 1140, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
{ width: 834, height: 1194, availWidth: 834, availHeight: 1154, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
{ width: 1024, height: 1366, availWidth: 1024, availHeight: 1326, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
{ width: 1032, height: 1376, availWidth: 1032, availHeight: 1336, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
{ width: 1067, height: 1600, availWidth: 1067, availHeight: 1560, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
]

const windowsScreens: readonly ScreenPreset[] = [
{ width: 1280, height: 720, availWidth: 1280, availHeight: 680, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 1 },
{ width: 1280, height: 800, availWidth: 1280, availHeight: 760, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 1 },
{ width: 1360, height: 768, availWidth: 1360, availHeight: 728, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 1 },
{ width: 1366, height: 768, availWidth: 1366, availHeight: 728, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 1 },
{ width: 1440, height: 900, availWidth: 1440, availHeight: 860, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 1 },
{ width: 1536, height: 864, availWidth: 1536, availHeight: 824, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 1.25 },
{ width: 1600, height: 900, availWidth: 1600, availHeight: 860, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 1 },
{ width: 1680, height: 1050, availWidth: 1680, availHeight: 1010, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 1 },
{ width: 1920, height: 1080, availWidth: 1920, availHeight: 1040, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 1 },
{ width: 1920, height: 1200, availWidth: 1920, availHeight: 1160, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 1 },
{ width: 2160, height: 1440, availWidth: 2160, availHeight: 1400, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 1.5 },
{ width: 2256, height: 1504, availWidth: 2256, availHeight: 1464, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 1.5 },
{ width: 2304, height: 1440, availWidth: 2304, availHeight: 1400, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 1.5 },
{ width: 2560, height: 1440, availWidth: 2560, availHeight: 1400, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 1.25 },
{ width: 2560, height: 1600, availWidth: 2560, availHeight: 1560, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 1.5 },
{ width: 2880, height: 1800, availWidth: 2880, availHeight: 1760, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 1.5 },
{ width: 3000, height: 2000, availWidth: 3000, availHeight: 1960, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
{ width: 3200, height: 1800, availWidth: 3200, availHeight: 1760, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
{ width: 3440, height: 1440, availWidth: 3440, availHeight: 1400, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 1 },
{ width: 3840, height: 2160, availWidth: 3840, availHeight: 2120, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 1.5 },
{ width: 1280, height: 1024, availWidth: 1280, availHeight: 984, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 1 },
{ width: 1600, height: 1200, availWidth: 1600, availHeight: 1160, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 1 },
{ width: 2048, height: 1152, availWidth: 2048, availHeight: 1112, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 1 },
{ width: 2560, height: 1080, availWidth: 2560, availHeight: 1040, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 1 },
{ width: 2736, height: 1824, availWidth: 2736, availHeight: 1784, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
{ width: 3072, height: 1920, availWidth: 3072, availHeight: 1880, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
{ width: 3840, height: 1600, availWidth: 3840, availHeight: 1560, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 1 },
{ width: 5120, height: 1440, availWidth: 5120, availHeight: 1400, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 1 },
{ width: 5120, height: 2880, availWidth: 5120, availHeight: 2840, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },

]

const linuxScreens: readonly ScreenPreset[] = [
{ width: 1280, height: 720, availWidth: 1280, availHeight: 680, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 1 },
{ width: 1366, height: 768, availWidth: 1366, availHeight: 728, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 1 },
{ width: 1440, height: 900, availWidth: 1440, availHeight: 860, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 1 },
{ width: 1600, height: 900, availWidth: 1600, availHeight: 860, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 1 },
{ width: 1680, height: 1050, availWidth: 1680, availHeight: 1010, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 1 },
{ width: 1920, height: 1080, availWidth: 1920, availHeight: 1040, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 1 },
{ width: 1920, height: 1200, availWidth: 1920, availHeight: 1160, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 1 },
{ width: 2160, height: 1440, availWidth: 2160, availHeight: 1400, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 1.5 },
{ width: 2256, height: 1504, availWidth: 2256, availHeight: 1464, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 1.5 },
{ width: 2560, height: 1440, availWidth: 2560, availHeight: 1400, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 1 },
{ width: 2560, height: 1600, availWidth: 2560, availHeight: 1560, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 1.25 },
{ width: 2880, height: 1800, availWidth: 2880, availHeight: 1760, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
{ width: 3000, height: 2000, availWidth: 3000, availHeight: 1960, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
{ width: 3440, height: 1440, availWidth: 3440, availHeight: 1400, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 1 },
{ width: 3840, height: 2160, availWidth: 3840, availHeight: 2120, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
{ width: 1280, height: 1024, availWidth: 1280, availHeight: 984, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 1 },
{ width: 1600, height: 1200, availWidth: 1600, availHeight: 1160, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 1 },
{ width: 2048, height: 1152, availWidth: 2048, availHeight: 1112, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 1 },
{ width: 2560, height: 1080, availWidth: 2560, availHeight: 1040, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 1 },
{ width: 2736, height: 1824, availWidth: 2736, availHeight: 1784, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
{ width: 3072, height: 1920, availWidth: 3072, availHeight: 1880, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
{ width: 3840, height: 1600, availWidth: 3840, availHeight: 1560, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 1 },
{ width: 5120, height: 1440, availWidth: 5120, availHeight: 1400, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 1 },
{ width: 5120, height: 2880, availWidth: 5120, availHeight: 2840, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },

]

const macScreens: readonly ScreenPreset[] = [
{ width: 1280, height: 800, availWidth: 1280, availHeight: 760, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
{ width: 1440, height: 900, availWidth: 1440, availHeight: 860, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
{ width: 1470, height: 956, availWidth: 1470, availHeight: 916, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
{ width: 1512, height: 982, availWidth: 1512, availHeight: 942, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
{ width: 1680, height: 1050, availWidth: 1680, availHeight: 1010, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
{ width: 1728, height: 1117, availWidth: 1728, availHeight: 1077, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
{ width: 1792, height: 1120, availWidth: 1792, availHeight: 1080, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
{ width: 2056, height: 1329, availWidth: 2056, availHeight: 1289, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
{ width: 2240, height: 1260, availWidth: 2240, availHeight: 1220, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
{ width: 2560, height: 1440, availWidth: 2560, availHeight: 1400, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
{ width: 1280, height: 832, availWidth: 1280, availHeight: 792, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
{ width: 1344, height: 840, availWidth: 1344, availHeight: 800, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
{ width: 1496, height: 967, availWidth: 1496, availHeight: 927, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
{ width: 1600, height: 1024, availWidth: 1600, availHeight: 984, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
{ width: 1710, height: 1107, availWidth: 1710, availHeight: 1067, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
{ width: 1800, height: 1169, availWidth: 1800, availHeight: 1129, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
{ width: 1920, height: 1200, availWidth: 1920, availHeight: 1160, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
{ width: 2560, height: 1664, availWidth: 2560, availHeight: 1624, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
{ width: 3024, height: 1964, availWidth: 3024, availHeight: 1924, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
{ width: 3456, height: 2234, availWidth: 3456, availHeight: 2194, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },

]

type DesktopGpuRecord = {
  readonly webgl: WebGLPreset
  readonly gpu: GPUPreset
}

const windowsDesktopGpuCatalog: readonly DesktopGpuRecord[] = [

  {
    webgl: { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) HD Graphics 4000 (0x00000166) Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'intel', architecture: 'gen7', device: '0x0166', description: 'Intel(R) HD Graphics 4000', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) HD Graphics 520 (0x00001916) Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'intel', architecture: 'gen9', device: '0x1916', description: 'Intel(R) HD Graphics 520', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 620 (0x00005917) Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'intel', architecture: 'gen9', device: '0x5917', description: 'Intel(R) UHD Graphics 620', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 630 (0x00003E92) Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'intel', architecture: 'gen9', device: '0x3e92', description: 'Intel(R) UHD Graphics 630', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x00009A49) Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'intel', architecture: 'gen12lp', device: '0x9a49', description: 'Intel(R) Iris(R) Xe Graphics', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) Arc(TM) A370M Graphics (0x00005693) Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'intel', architecture: 'alchemist', device: '0x5693', description: 'Intel(R) Arc(TM) A370M Graphics', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) Arc(TM) A580 Graphics (0x000056A2) Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'intel', architecture: 'alchemist', device: '0x56a2', description: 'Intel(R) Arc(TM) A580 Graphics', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) Arc(TM) A750 Graphics (0x000056A1) Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'intel', architecture: 'alchemist', device: '0x56a1', description: 'Intel(R) Arc(TM) A750 Graphics', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) Arc(TM) A770 Graphics (0x000056A0) Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'intel', architecture: 'alchemist', device: '0x56a0', description: 'Intel(R) Arc(TM) A770 Graphics', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1050 Ti (0x00001C82) Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'nvidia', architecture: 'pascal', device: '0x1c82', description: 'NVIDIA GeForce GTX 1050 Ti', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1060 6GB (0x00001C03) Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'nvidia', architecture: 'pascal', device: '0x1c03', description: 'NVIDIA GeForce GTX 1060 6GB', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1070 (0x00001B81) Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'nvidia', architecture: 'pascal', device: '0x1b81', description: 'NVIDIA GeForce GTX 1070', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1080 (0x00001B80) Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'nvidia', architecture: 'pascal', device: '0x1b80', description: 'NVIDIA GeForce GTX 1080', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1650 (0x00001F82) Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'nvidia', architecture: 'turing', device: '0x1f82', description: 'NVIDIA GeForce GTX 1650', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 SUPER (0x00002184) Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'nvidia', architecture: 'turing', device: '0x2184', description: 'NVIDIA GeForce GTX 1660 SUPER', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 2060 (0x00001F08) Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'nvidia', architecture: 'turing', device: '0x1f08', description: 'NVIDIA GeForce RTX 2060', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 2070 SUPER (0x00001E84) Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'nvidia', architecture: 'turing', device: '0x1e84', description: 'NVIDIA GeForce RTX 2070 SUPER', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3050 Laptop GPU (0x000025A2) Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'nvidia', architecture: 'ampere', device: '0x25a2', description: 'NVIDIA GeForce RTX 3050 Laptop GPU', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 (0x00002504) Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'nvidia', architecture: 'ampere', device: '0x2504', description: 'NVIDIA GeForce RTX 3060', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'nvidia', architecture: 'ampere', device: 'rtx-3070', description: 'NVIDIA GeForce RTX 3070', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3080 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'nvidia', architecture: 'ampere', device: 'rtx-3080', description: 'NVIDIA GeForce RTX 3080', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Laptop GPU (0x000028A0) Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'nvidia', architecture: 'ada', device: '0x28a0', description: 'NVIDIA GeForce RTX 4060 Laptop GPU', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Laptop GPU (0x00002820) Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'nvidia', architecture: 'ada', device: '0x2820', description: 'NVIDIA GeForce RTX 4070 Laptop GPU', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4080 SUPER Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'nvidia', architecture: 'ada', device: 'rtx-4080-super', description: 'NVIDIA GeForce RTX 4080 SUPER', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4090 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'nvidia', architecture: 'ada', device: 'rtx-4090', description: 'NVIDIA GeForce RTX 4090', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 560 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'amd', architecture: 'polaris', device: 'rx-560', description: 'AMD Radeon RX 560', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 570 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'amd', architecture: 'polaris', device: 'rx-570', description: 'AMD Radeon RX 570', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 580 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'amd', architecture: 'polaris', device: 'rx-580', description: 'AMD Radeon RX 580', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 5500 XT Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'amd', architecture: 'rdna1', device: 'rx-5500-xt', description: 'AMD Radeon RX 5500 XT', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 5600 XT Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'amd', architecture: 'rdna1', device: 'rx-5600-xt', description: 'AMD Radeon RX 5600 XT', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 5700 XT Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'amd', architecture: 'rdna1', device: 'rx-5700-xt', description: 'AMD Radeon RX 5700 XT', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 6600 XT (0x000073FF) Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'amd', architecture: 'rdna2', device: '0x73ff', description: 'AMD Radeon RX 6600 XT', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 6700 XT Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'amd', architecture: 'rdna2', device: 'rx-6700-xt', description: 'AMD Radeon RX 6700 XT', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 6800 XT Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'amd', architecture: 'rdna2', device: 'rx-6800-xt', description: 'AMD Radeon RX 6800 XT', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 7600 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'amd', architecture: 'rdna3', device: 'rx-7600', description: 'AMD Radeon RX 7600', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 7600 XT (0x00007480) Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'amd', architecture: 'rdna3', device: '0x7480', description: 'AMD Radeon RX 7600 XT', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 7700 XT Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'amd', architecture: 'rdna3', device: 'rx-7700-xt', description: 'AMD Radeon RX 7700 XT', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 7800 XT (0x0000747E) Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'amd', architecture: 'rdna3', device: '0x747e', description: 'AMD Radeon RX 7800 XT', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 7900 XT Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'amd', architecture: 'rdna3', device: 'rx-7900-xt', description: 'AMD Radeon RX 7900 XT', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 7900 XTX Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'amd', architecture: 'rdna3', device: 'rx-7900-xtx', description: 'AMD Radeon RX 7900 XTX', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 6600M Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'amd', architecture: 'rdna2', device: 'rx-6600m', description: 'AMD Radeon RX 6600M', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 7600M XT Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'amd', architecture: 'rdna3', device: 'rx-7600m-xt', description: 'AMD Radeon RX 7600M XT', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon 680M Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'amd', architecture: 'rdna2', device: 'gfx1035', description: 'AMD Radeon 680M', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon 780M Graphics (0x000015BF) Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'amd', architecture: 'rdna3', device: 'gfx1103', description: 'AMD Radeon 780M', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon 890M Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'amd', architecture: 'rdna35', device: 'gfx1150', description: 'AMD Radeon 890M', isFallbackAdapter: false },
  },
{
  webgl: { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) HD Graphics 4600 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  gpu: { vendor: 'intel', architecture: 'gen7', device: 'hd-4600', description: 'Intel(R) HD Graphics 4600', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) HD Graphics 530 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  gpu: { vendor: 'intel', architecture: 'gen9', device: 'hd-530', description: 'Intel(R) HD Graphics 530', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) Iris(R) Plus Graphics 640 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  gpu: { vendor: 'intel', architecture: 'gen9', device: 'iris-plus-640', description: 'Intel(R) Iris(R) Plus Graphics 640', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) Iris(R) Plus Graphics 655 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  gpu: { vendor: 'intel', architecture: 'gen9', device: 'iris-plus-655', description: 'Intel(R) Iris(R) Plus Graphics 655', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 730 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  gpu: { vendor: 'intel', architecture: 'gen12lp', device: 'uhd-730', description: 'Intel(R) UHD Graphics 730', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 770 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  gpu: { vendor: 'intel', architecture: 'gen12lp', device: 'uhd-770', description: 'Intel(R) UHD Graphics 770', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 750 Ti Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  gpu: { vendor: 'nvidia', architecture: 'maxwell', device: 'gtx-750-ti', description: 'NVIDIA GeForce GTX 750 Ti', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 960 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  gpu: { vendor: 'nvidia', architecture: 'maxwell', device: 'gtx-960', description: 'NVIDIA GeForce GTX 960', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 970 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  gpu: { vendor: 'nvidia', architecture: 'maxwell', device: 'gtx-970', description: 'NVIDIA GeForce GTX 970', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 980 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  gpu: { vendor: 'nvidia', architecture: 'maxwell', device: 'gtx-980', description: 'NVIDIA GeForce GTX 980', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1050 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  gpu: { vendor: 'nvidia', architecture: 'pascal', device: 'gtx-1050', description: 'NVIDIA GeForce GTX 1050', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1650 Ti Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  gpu: { vendor: 'nvidia', architecture: 'turing', device: 'gtx-1650-ti', description: 'NVIDIA GeForce GTX 1650 Ti', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 2050 Laptop GPU Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  gpu: { vendor: 'nvidia', architecture: 'ampere', device: 'rtx-2050-laptop', description: 'NVIDIA GeForce RTX 2050 Laptop GPU', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 2060 Laptop GPU Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  gpu: { vendor: 'nvidia', architecture: 'turing', device: 'rtx-2060-laptop', description: 'NVIDIA GeForce RTX 2060 Laptop GPU', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 2070 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  gpu: { vendor: 'nvidia', architecture: 'turing', device: 'rtx-2070', description: 'NVIDIA GeForce RTX 2070', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 2080 SUPER Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  gpu: { vendor: 'nvidia', architecture: 'turing', device: 'rtx-2080-super', description: 'NVIDIA GeForce RTX 2080 SUPER', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 Laptop GPU Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  gpu: { vendor: 'nvidia', architecture: 'ampere', device: 'rtx-3070-laptop', description: 'NVIDIA GeForce RTX 3070 Laptop GPU', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3080 Laptop GPU Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  gpu: { vendor: 'nvidia', architecture: 'ampere', device: 'rtx-3080-laptop', description: 'NVIDIA GeForce RTX 3080 Laptop GPU', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4050 Laptop GPU Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  gpu: { vendor: 'nvidia', architecture: 'ada', device: 'rtx-4050-laptop', description: 'NVIDIA GeForce RTX 4050 Laptop GPU', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  gpu: { vendor: 'nvidia', architecture: 'ada', device: 'rtx-4060', description: 'NVIDIA GeForce RTX 4060', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  gpu: { vendor: 'nvidia', architecture: 'ada', device: 'rtx-4070', description: 'NVIDIA GeForce RTX 4070', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4080 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  gpu: { vendor: 'nvidia', architecture: 'ada', device: 'rtx-4080', description: 'NVIDIA GeForce RTX 4080', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 460 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  gpu: { vendor: 'amd', architecture: 'polaris', device: 'rx-460', description: 'AMD Radeon RX 460', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 470 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  gpu: { vendor: 'amd', architecture: 'polaris', device: 'rx-470', description: 'AMD Radeon RX 470', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 480 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  gpu: { vendor: 'amd', architecture: 'polaris', device: 'rx-480', description: 'AMD Radeon RX 480', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 590 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  gpu: { vendor: 'amd', architecture: 'polaris', device: 'rx-590', description: 'AMD Radeon RX 590', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 6500 XT Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  gpu: { vendor: 'amd', architecture: 'rdna2', device: 'rx-6500-xt', description: 'AMD Radeon RX 6500 XT', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 6600 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  gpu: { vendor: 'amd', architecture: 'rdna2', device: 'rx-6600', description: 'AMD Radeon RX 6600', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 6650 XT Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  gpu: { vendor: 'amd', architecture: 'rdna2', device: 'rx-6650-xt', description: 'AMD Radeon RX 6650 XT', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 6750 XT Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  gpu: { vendor: 'amd', architecture: 'rdna2', device: 'rx-6750-xt', description: 'AMD Radeon RX 6750 XT', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 6900 XT Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  gpu: { vendor: 'amd', architecture: 'rdna2', device: 'rx-6900-xt', description: 'AMD Radeon RX 6900 XT', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 6950 XT Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  gpu: { vendor: 'amd', architecture: 'rdna2', device: 'rx-6950-xt', description: 'AMD Radeon RX 6950 XT', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 7900 GRE Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  gpu: { vendor: 'amd', architecture: 'rdna3', device: 'rx-7900-gre', description: 'AMD Radeon RX 7900 GRE', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 6800M Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  gpu: { vendor: 'amd', architecture: 'rdna2', device: 'rx-6800m', description: 'AMD Radeon RX 6800M', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 6850M XT Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  gpu: { vendor: 'amd', architecture: 'rdna2', device: 'rx-6850m-xt', description: 'AMD Radeon RX 6850M XT', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon 680M Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  gpu: { vendor: 'amd', architecture: 'rdna2', device: 'gfx1035', description: 'AMD Radeon 680M', isFallbackAdapter: false },
},
  {
    webgl: { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) HD Graphics 4600 (0x00000412) Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'intel', architecture: 'gen7.5', device: '0x0412', description: 'Intel(R) HD Graphics 4600', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) HD Graphics 530 (0x00001912) Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'intel', architecture: 'gen9', device: '0x1912', description: 'Intel(R) HD Graphics 530', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) Iris Plus Graphics 655 (0x00003EA5) Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'intel', architecture: 'gen9.5', device: '0x3ea5', description: 'Intel(R) Iris Plus Graphics 655', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 730 (0x00004682) Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'intel', architecture: 'gen12', device: '0x4682', description: 'Intel(R) UHD Graphics 730', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 770 (0x00004680) Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'intel', architecture: 'gen12', device: '0x4680', description: 'Intel(R) UHD Graphics 770', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 750 Ti (0x00001380) Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'nvidia', architecture: 'maxwell', device: '0x1380', description: 'NVIDIA GeForce GTX 750 Ti', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 960 (0x00001401) Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'nvidia', architecture: 'maxwell', device: '0x1401', description: 'NVIDIA GeForce GTX 960', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 970 (0x000013C2) Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'nvidia', architecture: 'maxwell', device: '0x13c2', description: 'NVIDIA GeForce GTX 970', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 980 Ti (0x000017C8) Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'nvidia', architecture: 'maxwell', device: '0x17c8', description: 'NVIDIA GeForce GTX 980 Ti', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1650 Ti (0x00001F95) Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'nvidia', architecture: 'turing', device: '0x1f95', description: 'NVIDIA GeForce GTX 1650 Ti', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 2050 Laptop GPU (0x000025AD) Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'nvidia', architecture: 'ampere', device: '0x25ad', description: 'NVIDIA GeForce RTX 2050 Laptop GPU', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 2060 Laptop GPU (0x00001F15) Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'nvidia', architecture: 'turing', device: '0x1f15', description: 'NVIDIA GeForce RTX 2060 Laptop GPU', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 2080 SUPER (0x00001E81) Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'nvidia', architecture: 'turing', device: '0x1e81', description: 'NVIDIA GeForce RTX 2080 SUPER', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 Laptop GPU (0x000024DD) Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'nvidia', architecture: 'ampere', device: '0x24dd', description: 'NVIDIA GeForce RTX 3070 Laptop GPU', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3080 Laptop GPU (0x000024DC) Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'nvidia', architecture: 'ampere', device: '0x24dc', description: 'NVIDIA GeForce RTX 3080 Laptop GPU', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4050 Laptop GPU (0x000028E1) Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'nvidia', architecture: 'ada', device: '0x28e1', description: 'NVIDIA GeForce RTX 4050 Laptop GPU', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 460 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'amd', architecture: 'polaris', device: 'rx-460', description: 'AMD Radeon RX 460', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 470 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'amd', architecture: 'polaris', device: 'rx-470', description: 'AMD Radeon RX 470', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 480 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'amd', architecture: 'polaris', device: 'rx-480', description: 'AMD Radeon RX 480', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 590 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'amd', architecture: 'polaris', device: 'rx-590', description: 'AMD Radeon RX 590', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 6500 XT Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'amd', architecture: 'rdna2', device: 'rx-6500-xt', description: 'AMD Radeon RX 6500 XT', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 6600 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'amd', architecture: 'rdna2', device: 'rx-6600', description: 'AMD Radeon RX 6600', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 6650 XT Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'amd', architecture: 'rdna2', device: 'rx-6650-xt', description: 'AMD Radeon RX 6650 XT', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 6750 XT Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'amd', architecture: 'rdna2', device: 'rx-6750-xt', description: 'AMD Radeon RX 6750 XT', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 6900 XT Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'amd', architecture: 'rdna2', device: 'rx-6900-xt', description: 'AMD Radeon RX 6900 XT', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 6950 XT Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    gpu: { vendor: 'amd', architecture: 'rdna2', device: 'rx-6950-xt', description: 'AMD Radeon RX 6950 XT', isFallbackAdapter: false },
  },

]

const linuxDesktopGpuCatalog: readonly DesktopGpuRecord[] = [

  {
    webgl: { vendor: 'Intel', renderer: 'Mesa Intel(R) HD Graphics 4000 (IVB GT2)' },
    gpu: { vendor: 'intel', architecture: 'gen7', device: '0x0166', description: 'Intel(R) HD Graphics 4000', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Intel', renderer: 'Mesa Intel(R) HD Graphics 520 (SKL GT2)' },
    gpu: { vendor: 'intel', architecture: 'gen9', device: '0x1916', description: 'Intel(R) HD Graphics 520', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Intel', renderer: 'Mesa Intel(R) UHD Graphics 620 (KBL GT2) (0x5917)' },
    gpu: { vendor: 'intel', architecture: 'gen9', device: '0x5917', description: 'Intel(R) UHD Graphics 620', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Intel', renderer: 'Mesa Intel(R) UHD Graphics 630 (CFL GT2) (0x3e92)' },
    gpu: { vendor: 'intel', architecture: 'gen9', device: '0x3e92', description: 'Intel(R) UHD Graphics 630', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Intel', renderer: 'Mesa Intel(R) Iris(R) Xe Graphics (TGL GT2) (0x9a49)' },
    gpu: { vendor: 'intel', architecture: 'gen12lp', device: '0x9a49', description: 'Intel(R) Iris(R) Xe Graphics', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Intel', renderer: 'Mesa Intel(R) Arc(tm) A370M Graphics (DG2) (0x5693)' },
    gpu: { vendor: 'intel', architecture: 'alchemist', device: '0x5693', description: 'Intel(R) Arc(TM) A370M Graphics', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Intel', renderer: 'Mesa Intel(R) Arc(tm) A580 Graphics (DG2) (0x56a2)' },
    gpu: { vendor: 'intel', architecture: 'alchemist', device: '0x56a2', description: 'Intel(R) Arc(TM) A580 Graphics', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Intel', renderer: 'Mesa Intel(R) Arc(tm) A750 Graphics (DG2) (0x56a1)' },
    gpu: { vendor: 'intel', architecture: 'alchemist', device: '0x56a1', description: 'Intel(R) Arc(TM) A750 Graphics', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Intel', renderer: 'Mesa Intel(R) Arc(tm) A770 Graphics (DG2) (0x56a0)' },
    gpu: { vendor: 'intel', architecture: 'alchemist', device: '0x56a0', description: 'Intel(R) Arc(TM) A770 Graphics', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce GTX 1050 Ti/PCIe/SSE2' },
    gpu: { vendor: 'nvidia', architecture: 'pascal', device: '0x1c82', description: 'NVIDIA GeForce GTX 1050 Ti', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce GTX 1060 6GB/PCIe/SSE2' },
    gpu: { vendor: 'nvidia', architecture: 'pascal', device: '0x1c03', description: 'NVIDIA GeForce GTX 1060 6GB', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce GTX 1070/PCIe/SSE2' },
    gpu: { vendor: 'nvidia', architecture: 'pascal', device: '0x1b81', description: 'NVIDIA GeForce GTX 1070', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce GTX 1080/PCIe/SSE2' },
    gpu: { vendor: 'nvidia', architecture: 'pascal', device: '0x1b80', description: 'NVIDIA GeForce GTX 1080', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce GTX 1650/PCIe/SSE2' },
    gpu: { vendor: 'nvidia', architecture: 'turing', device: '0x1f82', description: 'NVIDIA GeForce GTX 1650', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce GTX 1660 SUPER/PCIe/SSE2' },
    gpu: { vendor: 'nvidia', architecture: 'turing', device: '0x2184', description: 'NVIDIA GeForce GTX 1660 SUPER', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce RTX 2060/PCIe/SSE2' },
    gpu: { vendor: 'nvidia', architecture: 'turing', device: '0x1f08', description: 'NVIDIA GeForce RTX 2060', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce RTX 2070 SUPER/PCIe/SSE2' },
    gpu: { vendor: 'nvidia', architecture: 'turing', device: '0x1e84', description: 'NVIDIA GeForce RTX 2070 SUPER', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce RTX 3050 Laptop GPU/PCIe/SSE2' },
    gpu: { vendor: 'nvidia', architecture: 'ampere', device: '0x25a2', description: 'NVIDIA GeForce RTX 3050 Laptop GPU', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce RTX 3060/PCIe/SSE2' },
    gpu: { vendor: 'nvidia', architecture: 'ampere', device: '0x2504', description: 'NVIDIA GeForce RTX 3060', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce RTX 3070/PCIe/SSE2' },
    gpu: { vendor: 'nvidia', architecture: 'ampere', device: 'rtx-3070', description: 'NVIDIA GeForce RTX 3070', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce RTX 3080/PCIe/SSE2' },
    gpu: { vendor: 'nvidia', architecture: 'ampere', device: 'rtx-3080', description: 'NVIDIA GeForce RTX 3080', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce RTX 4060 Laptop GPU/PCIe/SSE2' },
    gpu: { vendor: 'nvidia', architecture: 'ada', device: '0x28a0', description: 'NVIDIA GeForce RTX 4060 Laptop GPU', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce RTX 4070 Laptop GPU/PCIe/SSE2' },
    gpu: { vendor: 'nvidia', architecture: 'ada', device: '0x2820', description: 'NVIDIA GeForce RTX 4070 Laptop GPU', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce RTX 4080 SUPER/PCIe/SSE2' },
    gpu: { vendor: 'nvidia', architecture: 'ada', device: 'rtx-4080-super', description: 'NVIDIA GeForce RTX 4080 SUPER', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce RTX 4090/PCIe/SSE2' },
    gpu: { vendor: 'nvidia', architecture: 'ada', device: 'rtx-4090', description: 'NVIDIA GeForce RTX 4090', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'AMD', renderer: 'AMD Radeon RX 560 Series (RADV POLARIS11)' },
    gpu: { vendor: 'amd', architecture: 'polaris', device: 'rx-560', description: 'AMD Radeon RX 560', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'AMD', renderer: 'AMD Radeon RX 570 Series (RADV POLARIS10)' },
    gpu: { vendor: 'amd', architecture: 'polaris', device: 'rx-570', description: 'AMD Radeon RX 570', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'AMD', renderer: 'AMD Radeon RX 580 Series (RADV POLARIS10)' },
    gpu: { vendor: 'amd', architecture: 'polaris', device: 'rx-580', description: 'AMD Radeon RX 580', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'AMD', renderer: 'AMD Radeon RX 5500 XT (RADV NAVI14)' },
    gpu: { vendor: 'amd', architecture: 'rdna1', device: 'rx-5500-xt', description: 'AMD Radeon RX 5500 XT', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'AMD', renderer: 'AMD Radeon RX 5600 XT (RADV NAVI10)' },
    gpu: { vendor: 'amd', architecture: 'rdna1', device: 'rx-5600-xt', description: 'AMD Radeon RX 5600 XT', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'AMD', renderer: 'AMD Radeon RX 5700 XT (RADV NAVI10)' },
    gpu: { vendor: 'amd', architecture: 'rdna1', device: 'rx-5700-xt', description: 'AMD Radeon RX 5700 XT', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'AMD', renderer: 'AMD Radeon RX 6600 XT (RADV NAVI23)' },
    gpu: { vendor: 'amd', architecture: 'rdna2', device: '0x73ff', description: 'AMD Radeon RX 6600 XT', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'AMD', renderer: 'AMD Radeon RX 6700 XT (RADV NAVI22)' },
    gpu: { vendor: 'amd', architecture: 'rdna2', device: 'rx-6700-xt', description: 'AMD Radeon RX 6700 XT', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'AMD', renderer: 'AMD Radeon RX 6800 XT (RADV NAVI21)' },
    gpu: { vendor: 'amd', architecture: 'rdna2', device: 'rx-6800-xt', description: 'AMD Radeon RX 6800 XT', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'AMD', renderer: 'AMD Radeon RX 7600 (RADV NAVI33)' },
    gpu: { vendor: 'amd', architecture: 'rdna3', device: 'rx-7600', description: 'AMD Radeon RX 7600', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'AMD', renderer: 'AMD Radeon RX 7600 XT (RADV NAVI33)' },
    gpu: { vendor: 'amd', architecture: 'rdna3', device: '0x7480', description: 'AMD Radeon RX 7600 XT', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'AMD', renderer: 'AMD Radeon RX 7700 XT (RADV NAVI32)' },
    gpu: { vendor: 'amd', architecture: 'rdna3', device: 'rx-7700-xt', description: 'AMD Radeon RX 7700 XT', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'AMD', renderer: 'AMD Radeon RX 7800 XT (RADV NAVI32)' },
    gpu: { vendor: 'amd', architecture: 'rdna3', device: '0x747e', description: 'AMD Radeon RX 7800 XT', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'AMD', renderer: 'AMD Radeon RX 7900 XT (RADV NAVI31)' },
    gpu: { vendor: 'amd', architecture: 'rdna3', device: 'rx-7900-xt', description: 'AMD Radeon RX 7900 XT', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'AMD', renderer: 'AMD Radeon RX 7900 XTX (RADV NAVI31)' },
    gpu: { vendor: 'amd', architecture: 'rdna3', device: 'rx-7900-xtx', description: 'AMD Radeon RX 7900 XTX', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'AMD', renderer: 'AMD Radeon RX 6600M (RADV NAVI23)' },
    gpu: { vendor: 'amd', architecture: 'rdna2', device: 'rx-6600m', description: 'AMD Radeon RX 6600M', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'AMD', renderer: 'AMD Radeon RX 7600M XT (RADV NAVI33)' },
    gpu: { vendor: 'amd', architecture: 'rdna3', device: 'rx-7600m-xt', description: 'AMD Radeon RX 7600M XT', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'AMD', renderer: 'AMD Radeon 680M Graphics (RADV REMBRANDT)' },
    gpu: { vendor: 'amd', architecture: 'rdna2', device: 'gfx1035', description: 'AMD Radeon 680M', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'AMD', renderer: 'AMD Radeon 780M Graphics (RADV PHOENIX)' },
    gpu: { vendor: 'amd', architecture: 'rdna3', device: 'gfx1103', description: 'AMD Radeon 780M', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'AMD', renderer: 'AMD Radeon 890M Graphics (RADV GFX1150)' },
    gpu: { vendor: 'amd', architecture: 'rdna35', device: 'gfx1150', description: 'AMD Radeon 890M', isFallbackAdapter: false },
  },
{
  webgl: { vendor: 'Intel', renderer: 'Mesa Intel(R) HD Graphics 4600 (HSW GT2)' },
  gpu: { vendor: 'intel', architecture: 'gen7', device: 'hd-4600', description: 'Intel(R) HD Graphics 4600', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'Intel', renderer: 'Mesa Intel(R) HD Graphics 530 (SKL GT2)' },
  gpu: { vendor: 'intel', architecture: 'gen9', device: 'hd-530', description: 'Intel(R) HD Graphics 530', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'Intel', renderer: 'Mesa Intel(R) Iris(R) Plus Graphics 640 (KBL GT3e)' },
  gpu: { vendor: 'intel', architecture: 'gen9', device: 'iris-plus-640', description: 'Intel(R) Iris(R) Plus Graphics 640', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'Intel', renderer: 'Mesa Intel(R) Iris(R) Plus Graphics 655 (CFL GT3e)' },
  gpu: { vendor: 'intel', architecture: 'gen9', device: 'iris-plus-655', description: 'Intel(R) Iris(R) Plus Graphics 655', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'Intel', renderer: 'Mesa Intel(R) UHD Graphics 730 (ADL-S GT1)' },
  gpu: { vendor: 'intel', architecture: 'gen12lp', device: 'uhd-730', description: 'Intel(R) UHD Graphics 730', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'Intel', renderer: 'Mesa Intel(R) UHD Graphics 770 (ADL-S GT1)' },
  gpu: { vendor: 'intel', architecture: 'gen12lp', device: 'uhd-770', description: 'Intel(R) UHD Graphics 770', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce GTX 750 Ti/PCIe/SSE2' },
  gpu: { vendor: 'nvidia', architecture: 'maxwell', device: 'gtx-750-ti', description: 'NVIDIA GeForce GTX 750 Ti', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce GTX 960/PCIe/SSE2' },
  gpu: { vendor: 'nvidia', architecture: 'maxwell', device: 'gtx-960', description: 'NVIDIA GeForce GTX 960', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce GTX 970/PCIe/SSE2' },
  gpu: { vendor: 'nvidia', architecture: 'maxwell', device: 'gtx-970', description: 'NVIDIA GeForce GTX 970', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce GTX 980/PCIe/SSE2' },
  gpu: { vendor: 'nvidia', architecture: 'maxwell', device: 'gtx-980', description: 'NVIDIA GeForce GTX 980', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce GTX 1050/PCIe/SSE2' },
  gpu: { vendor: 'nvidia', architecture: 'pascal', device: 'gtx-1050', description: 'NVIDIA GeForce GTX 1050', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce GTX 1650 Ti/PCIe/SSE2' },
  gpu: { vendor: 'nvidia', architecture: 'turing', device: 'gtx-1650-ti', description: 'NVIDIA GeForce GTX 1650 Ti', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce RTX 2050 Laptop GPU/PCIe/SSE2' },
  gpu: { vendor: 'nvidia', architecture: 'ampere', device: 'rtx-2050-laptop', description: 'NVIDIA GeForce RTX 2050 Laptop GPU', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce RTX 2060 Laptop GPU/PCIe/SSE2' },
  gpu: { vendor: 'nvidia', architecture: 'turing', device: 'rtx-2060-laptop', description: 'NVIDIA GeForce RTX 2060 Laptop GPU', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce RTX 2070/PCIe/SSE2' },
  gpu: { vendor: 'nvidia', architecture: 'turing', device: 'rtx-2070', description: 'NVIDIA GeForce RTX 2070', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce RTX 2080 SUPER/PCIe/SSE2' },
  gpu: { vendor: 'nvidia', architecture: 'turing', device: 'rtx-2080-super', description: 'NVIDIA GeForce RTX 2080 SUPER', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce RTX 3070 Laptop GPU/PCIe/SSE2' },
  gpu: { vendor: 'nvidia', architecture: 'ampere', device: 'rtx-3070-laptop', description: 'NVIDIA GeForce RTX 3070 Laptop GPU', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce RTX 3080 Laptop GPU/PCIe/SSE2' },
  gpu: { vendor: 'nvidia', architecture: 'ampere', device: 'rtx-3080-laptop', description: 'NVIDIA GeForce RTX 3080 Laptop GPU', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce RTX 4050 Laptop GPU/PCIe/SSE2' },
  gpu: { vendor: 'nvidia', architecture: 'ada', device: 'rtx-4050-laptop', description: 'NVIDIA GeForce RTX 4050 Laptop GPU', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce RTX 4060/PCIe/SSE2' },
  gpu: { vendor: 'nvidia', architecture: 'ada', device: 'rtx-4060', description: 'NVIDIA GeForce RTX 4060', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce RTX 4070/PCIe/SSE2' },
  gpu: { vendor: 'nvidia', architecture: 'ada', device: 'rtx-4070', description: 'NVIDIA GeForce RTX 4070', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce RTX 4080/PCIe/SSE2' },
  gpu: { vendor: 'nvidia', architecture: 'ada', device: 'rtx-4080', description: 'NVIDIA GeForce RTX 4080', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'AMD', renderer: 'AMD Radeon RX 460 Graphics (RADV POLARIS11)' },
  gpu: { vendor: 'amd', architecture: 'polaris', device: 'rx-460', description: 'AMD Radeon RX 460', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'AMD', renderer: 'AMD Radeon RX 470 Graphics (RADV POLARIS10)' },
  gpu: { vendor: 'amd', architecture: 'polaris', device: 'rx-470', description: 'AMD Radeon RX 470', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'AMD', renderer: 'AMD Radeon RX 480 Graphics (RADV POLARIS10)' },
  gpu: { vendor: 'amd', architecture: 'polaris', device: 'rx-480', description: 'AMD Radeon RX 480', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'AMD', renderer: 'AMD Radeon RX 590 Graphics (RADV POLARIS30)' },
  gpu: { vendor: 'amd', architecture: 'polaris', device: 'rx-590', description: 'AMD Radeon RX 590', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'AMD', renderer: 'AMD Radeon RX 6500 XT (RADV NAVI24)' },
  gpu: { vendor: 'amd', architecture: 'rdna2', device: 'rx-6500-xt', description: 'AMD Radeon RX 6500 XT', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'AMD', renderer: 'AMD Radeon RX 6600 (RADV NAVI23)' },
  gpu: { vendor: 'amd', architecture: 'rdna2', device: 'rx-6600', description: 'AMD Radeon RX 6600', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'AMD', renderer: 'AMD Radeon RX 6650 XT (RADV NAVI23)' },
  gpu: { vendor: 'amd', architecture: 'rdna2', device: 'rx-6650-xt', description: 'AMD Radeon RX 6650 XT', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'AMD', renderer: 'AMD Radeon RX 6750 XT (RADV NAVI22)' },
  gpu: { vendor: 'amd', architecture: 'rdna2', device: 'rx-6750-xt', description: 'AMD Radeon RX 6750 XT', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'AMD', renderer: 'AMD Radeon RX 6900 XT (RADV NAVI21)' },
  gpu: { vendor: 'amd', architecture: 'rdna2', device: 'rx-6900-xt', description: 'AMD Radeon RX 6900 XT', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'AMD', renderer: 'AMD Radeon RX 6950 XT (RADV NAVI21)' },
  gpu: { vendor: 'amd', architecture: 'rdna2', device: 'rx-6950-xt', description: 'AMD Radeon RX 6950 XT', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'AMD', renderer: 'AMD Radeon RX 7900 GRE (RADV NAVI31)' },
  gpu: { vendor: 'amd', architecture: 'rdna3', device: 'rx-7900-gre', description: 'AMD Radeon RX 7900 GRE', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'AMD', renderer: 'AMD Radeon RX 6800M (RADV NAVI22)' },
  gpu: { vendor: 'amd', architecture: 'rdna2', device: 'rx-6800m', description: 'AMD Radeon RX 6800M', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'AMD', renderer: 'AMD Radeon RX 6850M XT (RADV NAVI22)' },
  gpu: { vendor: 'amd', architecture: 'rdna2', device: 'rx-6850m-xt', description: 'AMD Radeon RX 6850M XT', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'AMD', renderer: 'AMD Radeon 680M Graphics (RADV REMBRANDT)' },
  gpu: { vendor: 'amd', architecture: 'rdna2', device: 'gfx1035', description: 'AMD Radeon 680M', isFallbackAdapter: false },
},
  {
    webgl: { vendor: 'Intel', renderer: 'Mesa Intel(R) HD Graphics 4600 (HSW GT2)' },
    gpu: { vendor: 'intel', architecture: 'gen7.5', device: '0x0412', description: 'Intel(R) HD Graphics 4600', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Intel', renderer: 'Mesa Intel(R) HD Graphics 530 (SKL GT2)' },
    gpu: { vendor: 'intel', architecture: 'gen9', device: '0x1912', description: 'Intel(R) HD Graphics 530', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Intel', renderer: 'Mesa Intel(R) Iris Plus Graphics 655 (CFL GT3e)' },
    gpu: { vendor: 'intel', architecture: 'gen9.5', device: '0x3ea5', description: 'Intel(R) Iris Plus Graphics 655', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Intel', renderer: 'Mesa Intel(R) UHD Graphics 730 (ADL-S GT1)' },
    gpu: { vendor: 'intel', architecture: 'gen12', device: '0x4682', description: 'Intel(R) UHD Graphics 730', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Intel', renderer: 'Mesa Intel(R) UHD Graphics 770 (ADL-S GT1)' },
    gpu: { vendor: 'intel', architecture: 'gen12', device: '0x4680', description: 'Intel(R) UHD Graphics 770', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce GTX 750 Ti/PCIe/SSE2' },
    gpu: { vendor: 'nvidia', architecture: 'maxwell', device: '0x1380', description: 'NVIDIA GeForce GTX 750 Ti', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce GTX 960/PCIe/SSE2' },
    gpu: { vendor: 'nvidia', architecture: 'maxwell', device: '0x1401', description: 'NVIDIA GeForce GTX 960', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce GTX 970/PCIe/SSE2' },
    gpu: { vendor: 'nvidia', architecture: 'maxwell', device: '0x13c2', description: 'NVIDIA GeForce GTX 970', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce GTX 980 Ti/PCIe/SSE2' },
    gpu: { vendor: 'nvidia', architecture: 'maxwell', device: '0x17c8', description: 'NVIDIA GeForce GTX 980 Ti', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce GTX 1650 Ti/PCIe/SSE2' },
    gpu: { vendor: 'nvidia', architecture: 'turing', device: '0x1f95', description: 'NVIDIA GeForce GTX 1650 Ti', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce RTX 2050 Laptop GPU/PCIe/SSE2' },
    gpu: { vendor: 'nvidia', architecture: 'ampere', device: '0x25ad', description: 'NVIDIA GeForce RTX 2050 Laptop GPU', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce RTX 2060 Laptop GPU/PCIe/SSE2' },
    gpu: { vendor: 'nvidia', architecture: 'turing', device: '0x1f15', description: 'NVIDIA GeForce RTX 2060 Laptop GPU', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce RTX 2080 SUPER/PCIe/SSE2' },
    gpu: { vendor: 'nvidia', architecture: 'turing', device: '0x1e81', description: 'NVIDIA GeForce RTX 2080 SUPER', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce RTX 3070 Laptop GPU/PCIe/SSE2' },
    gpu: { vendor: 'nvidia', architecture: 'ampere', device: '0x24dd', description: 'NVIDIA GeForce RTX 3070 Laptop GPU', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce RTX 3080 Laptop GPU/PCIe/SSE2' },
    gpu: { vendor: 'nvidia', architecture: 'ampere', device: '0x24dc', description: 'NVIDIA GeForce RTX 3080 Laptop GPU', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'NVIDIA Corporation', renderer: 'NVIDIA GeForce RTX 4050 Laptop GPU/PCIe/SSE2' },
    gpu: { vendor: 'nvidia', architecture: 'ada', device: '0x28e1', description: 'NVIDIA GeForce RTX 4050 Laptop GPU', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'ATI Technologies Inc.', renderer: 'AMD Radeon RX 460 (POLARIS11, DRM 3.54.0, 6.8.0, LLVM 17.0.6)' },
    gpu: { vendor: 'amd', architecture: 'polaris', device: 'rx-460', description: 'AMD Radeon RX 460', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'ATI Technologies Inc.', renderer: 'AMD Radeon RX 470 (POLARIS10, DRM 3.54.0, 6.8.0, LLVM 17.0.6)' },
    gpu: { vendor: 'amd', architecture: 'polaris', device: 'rx-470', description: 'AMD Radeon RX 470', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'ATI Technologies Inc.', renderer: 'AMD Radeon RX 480 (POLARIS10, DRM 3.54.0, 6.8.0, LLVM 17.0.6)' },
    gpu: { vendor: 'amd', architecture: 'polaris', device: 'rx-480', description: 'AMD Radeon RX 480', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'ATI Technologies Inc.', renderer: 'AMD Radeon RX 590 (POLARIS30, DRM 3.54.0, 6.8.0, LLVM 17.0.6)' },
    gpu: { vendor: 'amd', architecture: 'polaris', device: 'rx-590', description: 'AMD Radeon RX 590', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'ATI Technologies Inc.', renderer: 'AMD Radeon RX 6500 XT (NAVI24, DRM 3.54.0, 6.8.0, LLVM 17.0.6)' },
    gpu: { vendor: 'amd', architecture: 'rdna2', device: 'rx-6500-xt', description: 'AMD Radeon RX 6500 XT', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'ATI Technologies Inc.', renderer: 'AMD Radeon RX 6600 (NAVI23, DRM 3.54.0, 6.8.0, LLVM 17.0.6)' },
    gpu: { vendor: 'amd', architecture: 'rdna2', device: 'rx-6600', description: 'AMD Radeon RX 6600', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'ATI Technologies Inc.', renderer: 'AMD Radeon RX 6650 XT (NAVI23, DRM 3.54.0, 6.8.0, LLVM 17.0.6)' },
    gpu: { vendor: 'amd', architecture: 'rdna2', device: 'rx-6650-xt', description: 'AMD Radeon RX 6650 XT', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'ATI Technologies Inc.', renderer: 'AMD Radeon RX 6750 XT (NAVI22, DRM 3.54.0, 6.8.0, LLVM 17.0.6)' },
    gpu: { vendor: 'amd', architecture: 'rdna2', device: 'rx-6750-xt', description: 'AMD Radeon RX 6750 XT', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'ATI Technologies Inc.', renderer: 'AMD Radeon RX 6900 XT (NAVI21, DRM 3.54.0, 6.8.0, LLVM 17.0.6)' },
    gpu: { vendor: 'amd', architecture: 'rdna2', device: 'rx-6900-xt', description: 'AMD Radeon RX 6900 XT', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'ATI Technologies Inc.', renderer: 'AMD Radeon RX 6950 XT (NAVI21, DRM 3.54.0, 6.8.0, LLVM 17.0.6)' },
    gpu: { vendor: 'amd', architecture: 'rdna2', device: 'rx-6950-xt', description: 'AMD Radeon RX 6950 XT', isFallbackAdapter: false },
  },

]

const macDesktopGpuCatalog: readonly DesktopGpuRecord[] = [

  {
    webgl: { vendor: 'Apple Inc.', renderer: 'Apple M1' },
    gpu: { vendor: 'apple', architecture: 'apple7', device: 'm1', description: 'Apple M1', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Apple Inc.', renderer: 'Apple M1 Pro' },
    gpu: { vendor: 'apple', architecture: 'apple7', device: 'm1-pro', description: 'Apple M1 Pro', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Apple Inc.', renderer: 'Apple M1 Max' },
    gpu: { vendor: 'apple', architecture: 'apple7', device: 'm1-max', description: 'Apple M1 Max', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Apple Inc.', renderer: 'Apple M1 Ultra' },
    gpu: { vendor: 'apple', architecture: 'apple7', device: 'm1-ultra', description: 'Apple M1 Ultra', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Apple Inc.', renderer: 'Apple M2' },
    gpu: { vendor: 'apple', architecture: 'apple8', device: 'm2', description: 'Apple M2', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Apple Inc.', renderer: 'Apple M2 Pro' },
    gpu: { vendor: 'apple', architecture: 'apple8', device: 'm2-pro', description: 'Apple M2 Pro', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Apple Inc.', renderer: 'Apple M2 Max' },
    gpu: { vendor: 'apple', architecture: 'apple8', device: 'm2-max', description: 'Apple M2 Max', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Apple Inc.', renderer: 'Apple M2 Ultra' },
    gpu: { vendor: 'apple', architecture: 'apple8', device: 'm2-ultra', description: 'Apple M2 Ultra', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Apple Inc.', renderer: 'Apple M3' },
    gpu: { vendor: 'apple', architecture: 'apple9', device: 'm3', description: 'Apple M3', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Apple Inc.', renderer: 'Apple M3 Pro' },
    gpu: { vendor: 'apple', architecture: 'apple9', device: 'm3-pro', description: 'Apple M3 Pro', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Apple Inc.', renderer: 'Apple M3 Max' },
    gpu: { vendor: 'apple', architecture: 'apple9', device: 'm3-max', description: 'Apple M3 Max', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Apple Inc.', renderer: 'Apple M3 Ultra' },
    gpu: { vendor: 'apple', architecture: 'apple9', device: 'm3-ultra', description: 'Apple M3 Ultra', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Apple Inc.', renderer: 'Apple M4' },
    gpu: { vendor: 'apple', architecture: 'apple10', device: 'm4', description: 'Apple M4', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Apple Inc.', renderer: 'Apple M4 Pro' },
    gpu: { vendor: 'apple', architecture: 'apple10', device: 'm4-pro', description: 'Apple M4 Pro', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Apple Inc.', renderer: 'Apple M4 Max' },
    gpu: { vendor: 'apple', architecture: 'apple10', device: 'm4-max', description: 'Apple M4 Max', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Intel Inc.', renderer: 'Intel HD Graphics 4000 OpenGL Engine' },
    gpu: { vendor: 'intel', architecture: 'gen7', device: 'hd-4000', description: 'Intel HD Graphics 4000', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Intel Inc.', renderer: 'Intel Iris OpenGL Engine' },
    gpu: { vendor: 'intel', architecture: 'gen8', device: 'intel-iris', description: 'Intel Iris Graphics', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Intel Inc.', renderer: 'Intel Iris Plus Graphics 640 OpenGL Engine' },
    gpu: { vendor: 'intel', architecture: 'gen9', device: 'iris-plus-640', description: 'Intel Iris Plus Graphics 640', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Intel Inc.', renderer: 'Intel Iris Plus Graphics 645 OpenGL Engine' },
    gpu: { vendor: 'intel', architecture: 'gen9', device: 'iris-plus-645', description: 'Intel Iris Plus Graphics 645', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'Intel Inc.', renderer: 'Intel UHD Graphics 630' },
    gpu: { vendor: 'intel', architecture: 'gen9', device: 'uhd-630', description: 'Intel UHD Graphics 630', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'ATI Technologies Inc.', renderer: 'AMD Radeon Pro 555X OpenGL Engine' },
    gpu: { vendor: 'amd', architecture: 'polaris', device: 'radeon-pro-555x', description: 'AMD Radeon Pro 555X', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'ATI Technologies Inc.', renderer: 'AMD Radeon Pro 560X OpenGL Engine' },
    gpu: { vendor: 'amd', architecture: 'polaris', device: 'radeon-pro-560x', description: 'AMD Radeon Pro 560X', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'ATI Technologies Inc.', renderer: 'Radeon Pro Vega 16 OpenGL Engine' },
    gpu: { vendor: 'amd', architecture: 'vega', device: 'radeon-pro-vega-16', description: 'Radeon Pro Vega 16', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'ATI Technologies Inc.', renderer: 'Radeon Pro Vega 20 OpenGL Engine' },
    gpu: { vendor: 'amd', architecture: 'vega', device: 'radeon-pro-vega-20', description: 'Radeon Pro Vega 20', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'ATI Technologies Inc.', renderer: 'AMD Radeon Pro 5300M OpenGL Engine' },
    gpu: { vendor: 'amd', architecture: 'rdna1', device: 'radeon-pro-5300m', description: 'AMD Radeon Pro 5300M', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'ATI Technologies Inc.', renderer: 'AMD Radeon Pro 5500M OpenGL Engine' },
    gpu: { vendor: 'amd', architecture: 'rdna1', device: 'radeon-pro-5500m', description: 'AMD Radeon Pro 5500M', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'ATI Technologies Inc.', renderer: 'AMD Radeon Pro 5600M OpenGL Engine' },
    gpu: { vendor: 'amd', architecture: 'rdna1', device: 'radeon-pro-5600m', description: 'AMD Radeon Pro 5600M', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'ATI Technologies Inc.', renderer: 'AMD Radeon Pro 5700 OpenGL Engine' },
    gpu: { vendor: 'amd', architecture: 'rdna1', device: 'radeon-pro-5700', description: 'AMD Radeon Pro 5700', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'ATI Technologies Inc.', renderer: 'AMD Radeon Pro 5700 XT OpenGL Engine' },
    gpu: { vendor: 'amd', architecture: 'rdna1', device: 'radeon-pro-5700-xt', description: 'AMD Radeon Pro 5700 XT', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'ATI Technologies Inc.', renderer: 'AMD Radeon Pro 580 OpenGL Engine' },
    gpu: { vendor: 'amd', architecture: 'polaris', device: 'radeon-pro-580', description: 'AMD Radeon Pro 580', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'ATI Technologies Inc.', renderer: 'AMD Radeon Pro 580X OpenGL Engine' },
    gpu: { vendor: 'amd', architecture: 'polaris', device: 'radeon-pro-580x', description: 'AMD Radeon Pro 580X', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'ATI Technologies Inc.', renderer: 'Radeon Pro Vega 56 OpenGL Engine' },
    gpu: { vendor: 'amd', architecture: 'vega', device: 'radeon-pro-vega-56', description: 'Radeon Pro Vega 56', isFallbackAdapter: false },
  },
  {
    webgl: { vendor: 'ATI Technologies Inc.', renderer: 'Radeon Pro Vega 64X OpenGL Engine' },
    gpu: { vendor: 'amd', architecture: 'vega', device: 'radeon-pro-vega-64x', description: 'Radeon Pro Vega 64X', isFallbackAdapter: false },
  },
{
  webgl: { vendor: 'Apple Inc.', renderer: 'Apple M1 7-Core GPU' },
  gpu: { vendor: 'apple', architecture: 'apple7', device: 'm1-7c', description: 'Apple M1 7-Core GPU', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'Apple Inc.', renderer: 'Apple M2 10-Core GPU' },
  gpu: { vendor: 'apple', architecture: 'apple8', device: 'm2-10c', description: 'Apple M2 10-Core GPU', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'Apple Inc.', renderer: 'Apple M3 10-Core GPU' },
  gpu: { vendor: 'apple', architecture: 'apple9', device: 'm3-10c', description: 'Apple M3 10-Core GPU', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'Apple Inc.', renderer: 'Apple M4 10-Core GPU' },
  gpu: { vendor: 'apple', architecture: 'apple10', device: 'm4-10c', description: 'Apple M4 10-Core GPU', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'Intel Inc.', renderer: 'Intel Iris Plus Graphics 650 OpenGL Engine' },
  gpu: { vendor: 'intel', architecture: 'gen9', device: 'iris-plus-650', description: 'Intel Iris Plus Graphics 650', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'Intel Inc.', renderer: 'Intel UHD Graphics 617 OpenGL Engine' },
  gpu: { vendor: 'intel', architecture: 'gen9', device: 'uhd-617', description: 'Intel UHD Graphics 617', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'ATI Technologies Inc.', renderer: 'AMD Radeon Pro 555 OpenGL Engine' },
  gpu: { vendor: 'amd', architecture: 'polaris', device: 'radeon-pro-555', description: 'AMD Radeon Pro 555', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'ATI Technologies Inc.', renderer: 'AMD Radeon Pro 560 OpenGL Engine' },
  gpu: { vendor: 'amd', architecture: 'polaris', device: 'radeon-pro-560', description: 'AMD Radeon Pro 560', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'ATI Technologies Inc.', renderer: 'AMD Radeon Pro 570X OpenGL Engine' },
  gpu: { vendor: 'amd', architecture: 'polaris', device: 'radeon-pro-570x', description: 'AMD Radeon Pro 570X', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'ATI Technologies Inc.', renderer: 'AMD Radeon Pro 575X OpenGL Engine' },
  gpu: { vendor: 'amd', architecture: 'polaris', device: 'radeon-pro-575x', description: 'AMD Radeon Pro 575X', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'ATI Technologies Inc.', renderer: 'Radeon Pro Vega 48 OpenGL Engine' },
  gpu: { vendor: 'amd', architecture: 'vega', device: 'radeon-pro-vega-48', description: 'Radeon Pro Vega 48', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'Intel Inc.', renderer: 'Intel Iris Plus Graphics 655 OpenGL Engine' },
  gpu: { vendor: 'intel', architecture: 'gen9.5', device: 'iris-plus-655', description: 'Intel Iris Plus Graphics 655', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'Intel Inc.', renderer: 'Intel UHD Graphics 617 OpenGL Engine' },
  gpu: { vendor: 'intel', architecture: 'gen9.5', device: 'uhd-617', description: 'Intel UHD Graphics 617', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'ATI Technologies Inc.', renderer: 'Radeon Pro 555 OpenGL Engine' },
  gpu: { vendor: 'amd', architecture: 'polaris', device: 'radeon-pro-555', description: 'Radeon Pro 555', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'ATI Technologies Inc.', renderer: 'Radeon Pro 560 OpenGL Engine' },
  gpu: { vendor: 'amd', architecture: 'polaris', device: 'radeon-pro-560', description: 'Radeon Pro 560', isFallbackAdapter: false },
},
{
  webgl: { vendor: 'ATI Technologies Inc.', renderer: 'Radeon Pro Vega 48 OpenGL Engine' },
  gpu: { vendor: 'amd', architecture: 'vega', device: 'radeon-pro-vega-48', description: 'Radeon Pro Vega 48', isFallbackAdapter: false },
},

]

const androidWebGl: readonly WebGLPreset[] = [
{ vendor: 'Qualcomm', renderer: 'Adreno (TM) 619' },
{ vendor: 'Qualcomm', renderer: 'Adreno (TM) 642L' },
{ vendor: 'Qualcomm', renderer: 'Adreno (TM) 710' },
{ vendor: 'Qualcomm', renderer: 'Adreno (TM) 730' },
{ vendor: 'Qualcomm', renderer: 'Adreno (TM) 740' },
{ vendor: 'Qualcomm', renderer: 'Adreno (TM) 750' },
{ vendor: 'Qualcomm', renderer: 'Adreno (TM) 830' },
{ vendor: 'ARM', renderer: 'Mali-G52' },
{ vendor: 'ARM', renderer: 'Mali-G68' },
{ vendor: 'ARM', renderer: 'Mali-G78' },
{ vendor: 'ARM', renderer: 'Mali-G710' },
{ vendor: 'ARM', renderer: 'Mali-G715' },
{ vendor: 'ARM', renderer: 'Mali-G720' },
{ vendor: 'Qualcomm', renderer: 'Adreno (TM) 620' },
{ vendor: 'Qualcomm', renderer: 'Adreno (TM) 630' },
{ vendor: 'Qualcomm', renderer: 'Adreno (TM) 640' },
{ vendor: 'Qualcomm', renderer: 'Adreno (TM) 650' },
{ vendor: 'Qualcomm', renderer: 'Adreno (TM) 660' },
{ vendor: 'ARM', renderer: 'Mali-G57' },
{ vendor: 'ARM', renderer: 'Mali-G76' },
{ vendor: 'ARM', renderer: 'Mali-G77' },
{ vendor: 'ARM', renderer: 'Mali-G610' },
{ vendor: 'ARM', renderer: 'Mali-G615' },

]

const iosWebGl: readonly WebGLPreset[] = [{ vendor: 'Apple Inc.', renderer: 'Apple GPU' }]


type DesktopOs = 'windows' | 'linux' | 'macOS'

type DesktopTier = 'entry' | 'mid' | 'high'

const classifyDesktopTier = (os: DesktopOs, record: DesktopGpuRecord): DesktopTier => {
  const description = record.gpu.description.toLowerCase()

  if (os === 'macOS') {
    if (/(max|ultra|5600m|5700 xt|5700|vega 56|vega 64x)/.test(description)) return 'high'
    if (/(pro|5300m|5500m|580x|580|vega 16|vega 20)/.test(description)) return 'mid'
    return 'entry'
  }

  if (/(rtx 4090|rtx 4080|rtx 4070|rtx 3080|rtx 3070|rx 7900|rx 7800 xt|rx 7700 xt|rx 6950 xt|rx 6900 xt|rx 6800 xt|arc\(tm\) a770|arc a770)/.test(description)) {
    return 'high'
  }

  if (/(rtx 4060|rtx 3050|rtx 3060|rtx 2060|rtx 2070|gtx 1660|rx 5600 xt|rx 5700 xt|rx 7600|rx 7600 xt|rx 6600 xt|rx 6700 xt|rx 6600m|rx 7600m|arc\(tm\) a370m|arc\(tm\) a580|arc\(tm\) a750|arc a370m|arc a580|arc a750|890m|780m)/.test(description)) {
    return 'mid'
  }

  return 'entry'
}


const buildDesktopDeviceCohort = (
  os: DesktopOs,
  record: DesktopGpuRecord,
  seed: number,
): { screen: ScreenPreset; hardwareConcurrency: number; deviceMemory: number | undefined } => {
  const tier = classifyDesktopTier(os, record)

  switch (os) {
    case 'windows': {
      const screens = tier === 'high'
        ? windowsScreens.filter((screen) => screen.width >= 1920)
        : tier === 'mid'
          ? windowsScreens.filter((screen) => screen.width >= 1440 && screen.width <= 3200)
          : windowsScreens.filter((screen) => screen.width <= 1920)
      const hardware = tier === 'high' ? [12, 16, 20, 24] : tier === 'mid' ? [8, 12, 16] : [4, 6, 8, 8]
      const memory = tier === 'high' ? [8, 16, 16, 32] : tier === 'mid' ? [8, 8, 16] : [4, 8, 8]
      return {
        screen: pick(screens, seed, 11),
        hardwareConcurrency: pick(hardware, seed, 31),
        deviceMemory: pick(memory, seed, 53),
      }
    }
    case 'linux': {
      const screens = tier === 'high'
        ? linuxScreens.filter((screen) => screen.width >= 1920)
        : tier === 'mid'
          ? linuxScreens.filter((screen) => screen.width >= 1440 && screen.width <= 3000)
          : linuxScreens.filter((screen) => screen.width <= 1920)
      const hardware = tier === 'high' ? [12, 16, 20, 24] : tier === 'mid' ? [8, 12, 16] : [4, 6, 8, 8]
      const memory = tier === 'high' ? [8, 16, 16, 32] : tier === 'mid' ? [8, 8, 16] : [4, 8, 8]
      return {
        screen: pick(screens, seed, 13),
        hardwareConcurrency: pick(hardware, seed, 37),
        deviceMemory: pick(memory, seed, 59),
      }
    }
    case 'macOS': {
      const screens = tier === 'high'
        ? macScreens.filter((screen) => screen.width >= 1680)
        : tier === 'mid'
          ? macScreens.filter((screen) => screen.width >= 1470 && screen.width <= 2240)
          : macScreens.filter((screen) => screen.width <= 1680)
      const hardware = tier === 'high' ? [12, 14, 16] : tier === 'mid' ? [8, 10, 12, 14] : [8, 8, 10]
      const memory = tier === 'high' ? [16, 24, 32] : tier === 'mid' ? [8, 16, 16, 24] : [8, 8, 16]
      return {
        screen: pick(screens, seed, 17),
        hardwareConcurrency: pick(hardware, seed, 41),
        deviceMemory: pick(memory, seed, 61),
      }
    }
  }
}

// ---------------------------------------------------------------------------

// Android device catalog — each record binds model → screen, cores, RAM, GPU.
// This prevents the "Galaxy Z Flip5 with Mali-G715" incoherence.
// ---------------------------------------------------------------------------

type AndroidDeviceRecord = {
  readonly model: string
  readonly aliases?: readonly string[]
  readonly screen: ScreenPreset
  readonly hardwareConcurrency: number
  readonly deviceMemory: number
  readonly webgl: WebGLPreset
  readonly gpu: GPUPreset
}

type IOSDeviceRecord = {
  readonly model: string
  readonly aliases?: readonly string[]
  readonly screen: ScreenPreset
  readonly hardwareConcurrency: number
  readonly webgl: WebGLPreset
  readonly gpu: GPUPreset
}

const androidDeviceCatalog: readonly AndroidDeviceRecord[] = [

  {
    model: 'Pixel 8a',
    screen: { width: 393, height: 873, availWidth: 393, availHeight: 849, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2.75 },
    hardwareConcurrency: 8, deviceMemory: 8,
    webgl: { vendor: 'ARM', renderer: 'Mali-G715' },
    gpu: { vendor: 'arm', architecture: 'valhall', device: 'mali-g715', description: 'ARM Mali-G715', isFallbackAdapter: false },
  },
  {
    model: 'Pixel 9',
    screen: { width: 412, height: 915, availWidth: 412, availHeight: 891, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2.625 },
    hardwareConcurrency: 8, deviceMemory: 8,
    webgl: { vendor: 'ARM', renderer: 'Mali-G715' },
    gpu: { vendor: 'arm', architecture: 'valhall', device: 'mali-g715', description: 'ARM Mali-G715', isFallbackAdapter: false },
  },
  {
    model: 'Pixel 9 Pro',
    screen: { width: 402, height: 874, availWidth: 402, availHeight: 850, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3 },
    hardwareConcurrency: 8, deviceMemory: 16,
    webgl: { vendor: 'ARM', renderer: 'Mali-G715' },
    gpu: { vendor: 'arm', architecture: 'valhall', device: 'mali-g715', description: 'ARM Mali-G715', isFallbackAdapter: false },
  },
  {
    model: 'Pixel 9 Pro Fold',
    screen: { width: 904, height: 2176, availWidth: 904, availHeight: 2128, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
    hardwareConcurrency: 8, deviceMemory: 16,
    webgl: { vendor: 'ARM', renderer: 'Mali-G715' },
    gpu: { vendor: 'arm', architecture: 'valhall', device: 'mali-g715', description: 'ARM Mali-G715', isFallbackAdapter: false },
  },
  {
    model: 'Pixel 7',
    screen: { width: 412, height: 915, availWidth: 412, availHeight: 891, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2.625 },
    hardwareConcurrency: 8, deviceMemory: 8,
    webgl: { vendor: 'ARM', renderer: 'Mali-G710' },
    gpu: { vendor: 'arm', architecture: 'valhall', device: 'mali-g710', description: 'ARM Mali-G710', isFallbackAdapter: false },
  },
  {
    model: 'Pixel 7 Pro',
    screen: { width: 412, height: 892, availWidth: 412, availHeight: 868, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3.5 },
    hardwareConcurrency: 8, deviceMemory: 12,
    webgl: { vendor: 'ARM', renderer: 'Mali-G710' },
    gpu: { vendor: 'arm', architecture: 'valhall', device: 'mali-g710', description: 'ARM Mali-G710', isFallbackAdapter: false },
  },
  {
    model: 'Pixel Tablet',
    screen: { width: 800, height: 1280, availWidth: 800, availHeight: 1240, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
    hardwareConcurrency: 8, deviceMemory: 8,
    webgl: { vendor: 'ARM', renderer: 'Mali-G710' },
    gpu: { vendor: 'arm', architecture: 'valhall', device: 'mali-g710', description: 'ARM Mali-G710', isFallbackAdapter: false },
  },
  {
    model: 'Galaxy S24',
    aliases: ['SM-S921B'],
    screen: { width: 393, height: 852, availWidth: 393, availHeight: 828, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3 },
    hardwareConcurrency: 8, deviceMemory: 8,
    webgl: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 750' },
    gpu: { vendor: 'qualcomm', architecture: 'adreno-750', device: 'sm8650', description: 'Qualcomm Adreno 750', isFallbackAdapter: false },
  },
  {
    model: 'Galaxy S24 Ultra',
    aliases: ['SM-S928B'],
    screen: { width: 384, height: 832, availWidth: 384, availHeight: 808, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3.5 },
    hardwareConcurrency: 8, deviceMemory: 12,
    webgl: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 750' },
    gpu: { vendor: 'qualcomm', architecture: 'adreno-750', device: 'sm8650', description: 'Qualcomm Adreno 750', isFallbackAdapter: false },
  },
  {
    model: 'Galaxy S25 Ultra',
    aliases: ['SM-S938B'],
    screen: { width: 384, height: 832, availWidth: 384, availHeight: 808, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3.5 },
    hardwareConcurrency: 8, deviceMemory: 12,
    webgl: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 830' },
    gpu: { vendor: 'qualcomm', architecture: 'adreno-830', device: 'sm8750', description: 'Qualcomm Adreno 830', isFallbackAdapter: false },
  },
  {
    model: 'Galaxy Z Flip 6',
    aliases: ['SM-F741B'],
    screen: { width: 360, height: 748, availWidth: 360, availHeight: 724, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3 },
    hardwareConcurrency: 8, deviceMemory: 12,
    webgl: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 750' },
    gpu: { vendor: 'qualcomm', architecture: 'adreno-750', device: 'sm8650', description: 'Qualcomm Adreno 750', isFallbackAdapter: false },
  },
  {
    model: 'Galaxy Z Fold 6',
    aliases: ['SM-F956B'],
    screen: { width: 904, height: 2176, availWidth: 904, availHeight: 2128, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
    hardwareConcurrency: 8, deviceMemory: 12,
    webgl: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 750' },
    gpu: { vendor: 'qualcomm', architecture: 'adreno-750', device: 'sm8650', description: 'Qualcomm Adreno 750', isFallbackAdapter: false },
  },
  {
    model: 'Galaxy A55 5G',
    aliases: ['SM-A556B'],
    screen: { width: 393, height: 873, availWidth: 393, availHeight: 849, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2.75 },
    hardwareConcurrency: 8, deviceMemory: 8,
    webgl: { vendor: 'ARM', renderer: 'Mali-G68' },
    gpu: { vendor: 'arm', architecture: 'valhall', device: 'mali-g68', description: 'ARM Mali-G68', isFallbackAdapter: false },
  },
  {
    model: 'Galaxy A54 5G',
    aliases: ['SM-A546B'],
    screen: { width: 393, height: 873, availWidth: 393, availHeight: 849, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2.75 },
    hardwareConcurrency: 8, deviceMemory: 8,
    webgl: { vendor: 'ARM', renderer: 'Mali-G68' },
    gpu: { vendor: 'arm', architecture: 'valhall', device: 'mali-g68', description: 'ARM Mali-G68', isFallbackAdapter: false },
  },
  {
    model: 'Galaxy Tab A9+ 5G',
    aliases: ['SM-X216B'],
    screen: { width: 800, height: 1280, availWidth: 800, availHeight: 1240, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
    hardwareConcurrency: 8, deviceMemory: 8,
    webgl: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 619' },
    gpu: { vendor: 'qualcomm', architecture: 'adreno-619', device: 'sm6375', description: 'Qualcomm Adreno 619', isFallbackAdapter: false },
  },
  {
    model: 'Galaxy Tab S9 Ultra 5G',
    aliases: ['SM-X916B'],
    screen: { width: 1067, height: 1600, availWidth: 1067, availHeight: 1552, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
    hardwareConcurrency: 8, deviceMemory: 12,
    webgl: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 740' },
    gpu: { vendor: 'qualcomm', architecture: 'adreno-740', device: 'sm8550', description: 'Qualcomm Adreno 740', isFallbackAdapter: false },
  },
  {
    model: 'Galaxy Tab S10 Ultra',
    aliases: ['SM-X926B'],
    screen: { width: 1067, height: 1600, availWidth: 1067, availHeight: 1552, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
    hardwareConcurrency: 8, deviceMemory: 12,
    webgl: { vendor: 'ARM', renderer: 'Mali-G720' },
    gpu: { vendor: 'arm', architecture: 'valhall', device: 'mali-g720', description: 'ARM Mali-G720', isFallbackAdapter: false },
  },
  {
    model: 'moto g54 5G',
    screen: { width: 393, height: 873, availWidth: 393, availHeight: 849, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2.75 },
    hardwareConcurrency: 8, deviceMemory: 8,
    webgl: { vendor: 'ARM', renderer: 'Mali-G68' },
    gpu: { vendor: 'arm', architecture: 'valhall', device: 'mali-g68', description: 'ARM Mali-G68', isFallbackAdapter: false },
  },
  {
    model: 'motorola edge 50 fusion',
    screen: { width: 412, height: 915, availWidth: 412, availHeight: 891, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2.625 },
    hardwareConcurrency: 8, deviceMemory: 8,
    webgl: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 710' },
    gpu: { vendor: 'qualcomm', architecture: 'adreno-710', device: 'sm7435', description: 'Qualcomm Adreno 710', isFallbackAdapter: false },
  },
  {
    model: 'motorola edge 50 pro',
    screen: { width: 412, height: 919, availWidth: 412, availHeight: 895, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3 },
    hardwareConcurrency: 8, deviceMemory: 12,
    webgl: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 735' },
    gpu: { vendor: 'qualcomm', architecture: 'adreno-735', device: 'sm8635', description: 'Qualcomm Adreno 735', isFallbackAdapter: false },
  },
  {
    model: 'motorola razr plus 2024',
    screen: { width: 360, height: 748, availWidth: 360, availHeight: 724, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3 },
    hardwareConcurrency: 8, deviceMemory: 12,
    webgl: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 735' },
    gpu: { vendor: 'qualcomm', architecture: 'adreno-735', device: 'sm8635', description: 'Qualcomm Adreno 735', isFallbackAdapter: false },
  },
  {
    model: 'OnePlus 13',
    aliases: ['CPH2653'],
    screen: { width: 412, height: 919, availWidth: 412, availHeight: 895, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3 },
    hardwareConcurrency: 8, deviceMemory: 12,
    webgl: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 830' },
    gpu: { vendor: 'qualcomm', architecture: 'adreno-830', device: 'sm8750', description: 'Qualcomm Adreno 830', isFallbackAdapter: false },
  },
  {
    model: 'OnePlus Nord 4',
    aliases: ['CPH2621'],
    screen: { width: 412, height: 915, availWidth: 412, availHeight: 891, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2.625 },
    hardwareConcurrency: 8, deviceMemory: 8,
    webgl: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 732' },
    gpu: { vendor: 'qualcomm', architecture: 'adreno-732', device: 'sm7675', description: 'Qualcomm Adreno 732', isFallbackAdapter: false },
  },
  {
    model: 'OnePlus Pad 2',
    aliases: ['OPD2403'],
    screen: { width: 1067, height: 1600, availWidth: 1067, availHeight: 1552, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
    hardwareConcurrency: 8, deviceMemory: 12,
    webgl: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 750' },
    gpu: { vendor: 'qualcomm', architecture: 'adreno-750', device: 'sm8650', description: 'Qualcomm Adreno 750', isFallbackAdapter: false },
  },
  {
    model: 'Phone (2a)',
    aliases: ['Nothing Phone (2a)'],
    screen: { width: 393, height: 873, availWidth: 393, availHeight: 849, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2.75 },
    hardwareConcurrency: 8, deviceMemory: 8,
    webgl: { vendor: 'ARM', renderer: 'Mali-G610' },
    gpu: { vendor: 'arm', architecture: 'valhall', device: 'mali-g610', description: 'ARM Mali-G610', isFallbackAdapter: false },
  },
  {
    model: 'Phone (3a)',
    aliases: ['Nothing Phone (3a)'],
    screen: { width: 412, height: 915, availWidth: 412, availHeight: 891, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2.625 },
    hardwareConcurrency: 8, deviceMemory: 12,
    webgl: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 710' },
    gpu: { vendor: 'qualcomm', architecture: 'adreno-710', device: 'sm7635', description: 'Qualcomm Adreno 710', isFallbackAdapter: false },
  },
  {
    model: 'Xiaomi 15',
    aliases: ['24129PN74G'],
    screen: { width: 393, height: 873, availWidth: 393, availHeight: 849, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3 },
    hardwareConcurrency: 8, deviceMemory: 12,
    webgl: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 830' },
    gpu: { vendor: 'qualcomm', architecture: 'adreno-830', device: 'sm8750', description: 'Qualcomm Adreno 830', isFallbackAdapter: false },
  },
  {
    model: 'Xiaomi Pad 7 Pro',
    aliases: ['2410CRP4CG'],
    screen: { width: 1067, height: 1600, availWidth: 1067, availHeight: 1552, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
    hardwareConcurrency: 8, deviceMemory: 8,
    webgl: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 735' },
    gpu: { vendor: 'qualcomm', architecture: 'adreno-735', device: 'sm8635', description: 'Qualcomm Adreno 735', isFallbackAdapter: false },
  },
  {
    model: 'HONOR Magic7 Pro',
    aliases: ['PTP-AN00'],
    screen: { width: 412, height: 915, availWidth: 412, availHeight: 891, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2.625 },
    hardwareConcurrency: 8, deviceMemory: 12,
    webgl: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 830' },
    gpu: { vendor: 'qualcomm', architecture: 'adreno-830', device: 'sm8750', description: 'Qualcomm Adreno 830', isFallbackAdapter: false },
  },
  {
    model: 'HONOR Pad V9',
    aliases: ['ROL-W60'],
    screen: { width: 1067, height: 1600, availWidth: 1067, availHeight: 1552, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
    hardwareConcurrency: 8, deviceMemory: 8,
    webgl: { vendor: 'ARM', renderer: 'Mali-G615' },
    gpu: { vendor: 'arm', architecture: 'valhall', device: 'mali-g615', description: 'ARM Mali-G615', isFallbackAdapter: false },
  },
  {
    model: 'Lenovo Tab P12',
    aliases: ['TB370FU'],
    screen: { width: 962, height: 1440, availWidth: 962, availHeight: 1400, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
    hardwareConcurrency: 8, deviceMemory: 8,
    webgl: { vendor: 'ARM', renderer: 'Mali-G57 MC2' },
    gpu: { vendor: 'arm', architecture: 'valhall', device: 'mali-g57', description: 'ARM Mali-G57', isFallbackAdapter: false },
  },
{
  model: 'Pixel 6a',
  screen: { width: 412, height: 915, availWidth: 412, availHeight: 891, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2.625 },
  hardwareConcurrency: 8, deviceMemory: 6,
  webgl: { vendor: 'ARM', renderer: 'Mali-G78' },
  gpu: { vendor: 'arm', architecture: 'valhall', device: 'mali-g78', description: 'ARM Mali-G78', isFallbackAdapter: false },
},
{
  model: 'Pixel 6',
  screen: { width: 412, height: 915, availWidth: 412, availHeight: 891, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2.625 },
  hardwareConcurrency: 8, deviceMemory: 8,
  webgl: { vendor: 'ARM', renderer: 'Mali-G78' },
  gpu: { vendor: 'arm', architecture: 'valhall', device: 'mali-g78', description: 'ARM Mali-G78', isFallbackAdapter: false },
},
{
  model: 'Pixel 6 Pro',
  screen: { width: 412, height: 892, availWidth: 412, availHeight: 868, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3.5 },
  hardwareConcurrency: 8, deviceMemory: 12,
  webgl: { vendor: 'ARM', renderer: 'Mali-G78' },
  gpu: { vendor: 'arm', architecture: 'valhall', device: 'mali-g78', description: 'ARM Mali-G78', isFallbackAdapter: false },
},
{
  model: 'Pixel 8',
  screen: { width: 412, height: 915, availWidth: 412, availHeight: 891, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2.625 },
  hardwareConcurrency: 8, deviceMemory: 8,
  webgl: { vendor: 'ARM', renderer: 'Mali-G715' },
  gpu: { vendor: 'arm', architecture: 'valhall', device: 'mali-g715', description: 'ARM Mali-G715', isFallbackAdapter: false },
},
{
  model: 'Pixel 8 Pro',
  screen: { width: 448, height: 998, availWidth: 448, availHeight: 974, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3 },
  hardwareConcurrency: 8, deviceMemory: 12,
  webgl: { vendor: 'ARM', renderer: 'Mali-G715' },
  gpu: { vendor: 'arm', architecture: 'valhall', device: 'mali-g715', description: 'ARM Mali-G715', isFallbackAdapter: false },
},
{
  model: 'Galaxy S23',
  aliases: ['SM-S911B'],
  screen: { width: 360, height: 780, availWidth: 360, availHeight: 756, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3 },
  hardwareConcurrency: 8, deviceMemory: 8,
  webgl: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 740' },
  gpu: { vendor: 'qualcomm', architecture: 'adreno-740', device: 'sm8550', description: 'Qualcomm Adreno 740', isFallbackAdapter: false },
},
{
  model: 'Galaxy S23 Ultra',
  aliases: ['SM-S918B'],
  screen: { width: 384, height: 832, availWidth: 384, availHeight: 808, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3.5 },
  hardwareConcurrency: 8, deviceMemory: 12,
  webgl: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 740' },
  gpu: { vendor: 'qualcomm', architecture: 'adreno-740', device: 'sm8550', description: 'Qualcomm Adreno 740', isFallbackAdapter: false },
},
{
  model: 'Galaxy S24+',
  aliases: ['SM-S926B'],
  screen: { width: 384, height: 832, availWidth: 384, availHeight: 808, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3.5 },
  hardwareConcurrency: 8, deviceMemory: 12,
  webgl: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 750' },
  gpu: { vendor: 'qualcomm', architecture: 'adreno-750', device: 'sm8650', description: 'Qualcomm Adreno 750', isFallbackAdapter: false },
},
{
  model: 'Galaxy S25',
  aliases: ['SM-S931B'],
  screen: { width: 393, height: 852, availWidth: 393, availHeight: 828, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3 },
  hardwareConcurrency: 8, deviceMemory: 12,
  webgl: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 830' },
  gpu: { vendor: 'qualcomm', architecture: 'adreno-830', device: 'sm8750', description: 'Qualcomm Adreno 830', isFallbackAdapter: false },
},
{
  model: 'Galaxy S25+',
  aliases: ['SM-S936B'],
  screen: { width: 384, height: 832, availWidth: 384, availHeight: 808, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3.5 },
  hardwareConcurrency: 8, deviceMemory: 12,
  webgl: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 830' },
  gpu: { vendor: 'qualcomm', architecture: 'adreno-830', device: 'sm8750', description: 'Qualcomm Adreno 830', isFallbackAdapter: false },
},
{
  model: 'Galaxy Z Flip 5',
  aliases: ['SM-F731B'],
  screen: { width: 360, height: 748, availWidth: 360, availHeight: 724, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3 },
  hardwareConcurrency: 8, deviceMemory: 8,
  webgl: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 740' },
  gpu: { vendor: 'qualcomm', architecture: 'adreno-740', device: 'sm8550', description: 'Qualcomm Adreno 740', isFallbackAdapter: false },
},
{
  model: 'Galaxy Z Fold 5',
  aliases: ['SM-F946B'],
  screen: { width: 904, height: 2176, availWidth: 904, availHeight: 2128, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
  hardwareConcurrency: 8, deviceMemory: 12,
  webgl: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 740' },
  gpu: { vendor: 'qualcomm', architecture: 'adreno-740', device: 'sm8550', description: 'Qualcomm Adreno 740', isFallbackAdapter: false },
},
{
  model: 'Galaxy A35 5G',
  aliases: ['SM-A356B'],
  screen: { width: 393, height: 873, availWidth: 393, availHeight: 849, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2.75 },
  hardwareConcurrency: 8, deviceMemory: 6,
  webgl: { vendor: 'ARM', renderer: 'Mali-G68' },
  gpu: { vendor: 'arm', architecture: 'valhall', device: 'mali-g68', description: 'ARM Mali-G68', isFallbackAdapter: false },
},
{
  model: 'Galaxy Tab S9',
  aliases: ['SM-X710'],
  screen: { width: 800, height: 1280, availWidth: 800, availHeight: 1240, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
  hardwareConcurrency: 8, deviceMemory: 8,
  webgl: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 740' },
  gpu: { vendor: 'qualcomm', architecture: 'adreno-740', device: 'sm8550', description: 'Qualcomm Adreno 740', isFallbackAdapter: false },
},
{
  model: 'Galaxy Tab S9+',
  aliases: ['SM-X810'],
  screen: { width: 875, height: 1400, availWidth: 875, availHeight: 1360, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
  hardwareConcurrency: 8, deviceMemory: 12,
  webgl: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 740' },
  gpu: { vendor: 'qualcomm', architecture: 'adreno-740', device: 'sm8550', description: 'Qualcomm Adreno 740', isFallbackAdapter: false },
},
{
  model: 'OnePlus 12',
  screen: { width: 450, height: 1000, availWidth: 450, availHeight: 976, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3.2 },
  hardwareConcurrency: 8, deviceMemory: 16,
  webgl: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 750' },
  gpu: { vendor: 'qualcomm', architecture: 'adreno-750', device: 'sm8650', description: 'Qualcomm Adreno 750', isFallbackAdapter: false },
},
{
  model: 'OnePlus 13R',
  screen: { width: 450, height: 1000, availWidth: 450, availHeight: 976, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3.2 },
  hardwareConcurrency: 8, deviceMemory: 12,
  webgl: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 750' },
  gpu: { vendor: 'qualcomm', architecture: 'adreno-750', device: 'sm8650', description: 'Qualcomm Adreno 750', isFallbackAdapter: false },
},
{
  model: 'OnePlus Open',
  screen: { width: 904, height: 2176, availWidth: 904, availHeight: 2128, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
  hardwareConcurrency: 8, deviceMemory: 16,
  webgl: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 740' },
  gpu: { vendor: 'qualcomm', architecture: 'adreno-740', device: 'sm8550', description: 'Qualcomm Adreno 740', isFallbackAdapter: false },
},
{
  model: 'Phone (1)',
  screen: { width: 393, height: 873, availWidth: 393, availHeight: 849, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2.75 },
  hardwareConcurrency: 8, deviceMemory: 8,
  webgl: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 642L' },
  gpu: { vendor: 'qualcomm', architecture: 'adreno-642l', device: 'sm7325', description: 'Qualcomm Adreno 642L', isFallbackAdapter: false },
},
{
  model: 'Phone (3a) Pro',
  screen: { width: 393, height: 873, availWidth: 393, availHeight: 849, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2.75 },
  hardwareConcurrency: 8, deviceMemory: 12,
  webgl: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 710' },
  gpu: { vendor: 'qualcomm', architecture: 'adreno-710', device: 'sm7635', description: 'Qualcomm Adreno 710', isFallbackAdapter: false },
},
{
  model: 'Xiaomi 14 Ultra',
  screen: { width: 432, height: 960, availWidth: 432, availHeight: 936, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3.3333333333 },
  hardwareConcurrency: 8, deviceMemory: 16,
  webgl: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 750' },
  gpu: { vendor: 'qualcomm', architecture: 'adreno-750', device: 'sm8650', description: 'Qualcomm Adreno 750', isFallbackAdapter: false },
},
{
  model: 'Redmi Note 13 Pro 5G',
  screen: { width: 393, height: 873, availWidth: 393, availHeight: 849, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2.75 },
  hardwareConcurrency: 8, deviceMemory: 8,
  webgl: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 710' },
  gpu: { vendor: 'qualcomm', architecture: 'adreno-710', device: 'sm7435', description: 'Qualcomm Adreno 710', isFallbackAdapter: false },
},
{
  model: 'POCO F6',
  screen: { width: 444, height: 986, availWidth: 444, availHeight: 962, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2.75 },
  hardwareConcurrency: 8, deviceMemory: 12,
  webgl: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 732' },
  gpu: { vendor: 'qualcomm', architecture: 'adreno-732', device: 'sm7675', description: 'Qualcomm Adreno 732', isFallbackAdapter: false },
},
{
  model: 'Lenovo Tab M11',
  screen: { width: 800, height: 1280, availWidth: 800, availHeight: 1240, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
  hardwareConcurrency: 8, deviceMemory: 8,
  webgl: { vendor: 'ARM', renderer: 'Mali-G52' },
  gpu: { vendor: 'arm', architecture: 'bifrost', device: 'mali-g52', description: 'ARM Mali-G52', isFallbackAdapter: false },
},
  {
    model: 'Pixel 7a',
    screen: { width: 393, height: 873, availWidth: 393, availHeight: 849, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2.75 },
    hardwareConcurrency: 8, deviceMemory: 8,
    webgl: { vendor: 'ARM', renderer: 'Mali-G710' },
    gpu: { vendor: 'arm', architecture: 'valhall', device: 'mali-g710', description: 'ARM Mali-G710', isFallbackAdapter: false },
  },
  {
    model: 'Pixel 9a',
    screen: { width: 412, height: 915, availWidth: 412, availHeight: 891, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2.625 },
    hardwareConcurrency: 8, deviceMemory: 8,
    webgl: { vendor: 'ARM', renderer: 'Mali-G715' },
    gpu: { vendor: 'arm', architecture: 'valhall', device: 'mali-g715', description: 'ARM Mali-G715', isFallbackAdapter: false },
  },
  {
    model: 'Pixel 9 Pro XL',
    screen: { width: 412, height: 892, availWidth: 412, availHeight: 868, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3.5 },
    hardwareConcurrency: 8, deviceMemory: 16,
    webgl: { vendor: 'ARM', renderer: 'Mali-G715' },
    gpu: { vendor: 'arm', architecture: 'valhall', device: 'mali-g715', description: 'ARM Mali-G715', isFallbackAdapter: false },
  },
  {
    model: 'Galaxy S23+',
    aliases: ['SM-S916B'],
    screen: { width: 412, height: 915, availWidth: 412, availHeight: 891, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2.625 },
    hardwareConcurrency: 8, deviceMemory: 8,
    webgl: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 740' },
    gpu: { vendor: 'qualcomm', architecture: 'adreno-740', device: 'sm8550', description: 'Qualcomm Adreno 740', isFallbackAdapter: false },
  },
  {
    model: 'Galaxy A56 5G',
    aliases: ['SM-A566B'],
    screen: { width: 412, height: 915, availWidth: 412, availHeight: 891, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2.625 },
    hardwareConcurrency: 8, deviceMemory: 8,
    webgl: { vendor: 'ARM', renderer: 'Mali-G68' },
    gpu: { vendor: 'arm', architecture: 'valhall', device: 'mali-g68', description: 'ARM Mali-G68', isFallbackAdapter: false },
  },
  {
    model: 'Galaxy A36 5G',
    aliases: ['SM-A366B'],
    screen: { width: 412, height: 915, availWidth: 412, availHeight: 891, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2.625 },
    hardwareConcurrency: 8, deviceMemory: 8,
    webgl: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 710' },
    gpu: { vendor: 'qualcomm', architecture: 'adreno-710', device: 'sm6475', description: 'Qualcomm Adreno 710', isFallbackAdapter: false },
  },
  {
    model: 'Galaxy S25 Edge',
    aliases: ['SM-S937B'],
    screen: { width: 412, height: 915, availWidth: 412, availHeight: 891, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3 },
    hardwareConcurrency: 8, deviceMemory: 12,
    webgl: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 830' },
    gpu: { vendor: 'qualcomm', architecture: 'adreno-830', device: 'sm8750', description: 'Qualcomm Adreno 830', isFallbackAdapter: false },
  },
  {
    model: 'Galaxy Tab S10+',
    aliases: ['SM-X820'],
    screen: { width: 900, height: 1600, availWidth: 900, availHeight: 1552, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
    hardwareConcurrency: 8, deviceMemory: 12,
    webgl: { vendor: 'ARM', renderer: 'Mali-G720' },
    gpu: { vendor: 'arm', architecture: 'valhall', device: 'mali-g720', description: 'ARM Mali-G720', isFallbackAdapter: false },
  },
  {
    model: 'OnePlus 12R',
    aliases: ['CPH2609'],
    screen: { width: 412, height: 915, availWidth: 412, availHeight: 891, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2.625 },
    hardwareConcurrency: 8, deviceMemory: 8,
    webgl: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 730' },
    gpu: { vendor: 'qualcomm', architecture: 'adreno-730', device: 'sm8475', description: 'Qualcomm Adreno 730', isFallbackAdapter: false },
  },
  {
    model: 'OnePlus 13R',
    aliases: ['CPH2645'],
    screen: { width: 412, height: 915, availWidth: 412, availHeight: 891, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2.625 },
    hardwareConcurrency: 8, deviceMemory: 12,
    webgl: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 750' },
    gpu: { vendor: 'qualcomm', architecture: 'adreno-750', device: 'sm8650', description: 'Qualcomm Adreno 750', isFallbackAdapter: false },
  },
  {
    model: 'OnePlus Pad 3',
    aliases: ['OPD2413'],
    screen: { width: 960, height: 1600, availWidth: 960, availHeight: 1552, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
    hardwareConcurrency: 8, deviceMemory: 12,
    webgl: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 830' },
    gpu: { vendor: 'qualcomm', architecture: 'adreno-830', device: 'sm8750', description: 'Qualcomm Adreno 830', isFallbackAdapter: false },
  },
  {
    model: 'moto g stylus 2025',
    screen: { width: 412, height: 915, availWidth: 412, availHeight: 891, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3 },
    hardwareConcurrency: 8, deviceMemory: 8,
    webgl: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 710' },
    gpu: { vendor: 'qualcomm', architecture: 'adreno-710', device: 'sm6475', description: 'Qualcomm Adreno 710', isFallbackAdapter: false },
  },
  {
    model: 'moto g 2025',
    screen: { width: 393, height: 873, availWidth: 393, availHeight: 849, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2.75 },
    hardwareConcurrency: 8, deviceMemory: 4,
    webgl: { vendor: 'ARM', renderer: 'Mali-G57' },
    gpu: { vendor: 'arm', architecture: 'valhall', device: 'mali-g57', description: 'ARM Mali-G57', isFallbackAdapter: false },
  },
  {
    model: 'Xiaomi 15 Ultra',
    aliases: ['25010PN30G'],
    screen: { width: 412, height: 919, availWidth: 412, availHeight: 895, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3 },
    hardwareConcurrency: 8, deviceMemory: 16,
    webgl: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 830' },
    gpu: { vendor: 'qualcomm', architecture: 'adreno-830', device: 'sm8750', description: 'Qualcomm Adreno 830', isFallbackAdapter: false },
  },
  {
    model: 'HONOR Magic6 Pro',
    aliases: ['BVL-N49'],
    screen: { width: 412, height: 915, availWidth: 412, availHeight: 891, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2.625 },
    hardwareConcurrency: 8, deviceMemory: 12,
    webgl: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 750' },
    gpu: { vendor: 'qualcomm', architecture: 'adreno-750', device: 'sm8650', description: 'Qualcomm Adreno 750', isFallbackAdapter: false },
  },
  {
    model: 'Redmi Note 14 Pro 5G',
    screen: { width: 393, height: 873, availWidth: 393, availHeight: 849, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2.75 },
    hardwareConcurrency: 8, deviceMemory: 8,
    webgl: { vendor: 'ARM', renderer: 'Mali-G615' },
    gpu: { vendor: 'arm', architecture: 'valhall', device: 'mali-g615', description: 'ARM Mali-G615', isFallbackAdapter: false },
  },
  {
    model: 'Redmi Note 14 Pro+ 5G',
    screen: { width: 412, height: 915, availWidth: 412, availHeight: 891, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2.625 },
    hardwareConcurrency: 8, deviceMemory: 12,
    webgl: { vendor: 'Qualcomm', renderer: 'Adreno (TM) 710' },
    gpu: { vendor: 'qualcomm', architecture: 'adreno-710', device: 'sm7635', description: 'Qualcomm Adreno 710', isFallbackAdapter: false },
  },

]

const iosDeviceCatalog: readonly IOSDeviceRecord[] = [

  {
    model: 'iPhone SE (2nd generation)',
    aliases: ['iPhone SE 2'],
    screen: { width: 375, height: 667, availWidth: 375, availHeight: 647, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
    hardwareConcurrency: 6,
    webgl: { vendor: 'Apple Inc.', renderer: 'Apple GPU' },
    gpu: { vendor: 'apple', architecture: 'apple-gpu', device: 'a13-gpu', description: 'Apple GPU', isFallbackAdapter: false },
  },
  {
    model: 'iPhone SE (3rd generation)',
    aliases: ['iPhone SE 3'],
    screen: { width: 375, height: 667, availWidth: 375, availHeight: 647, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
    hardwareConcurrency: 6,
    webgl: { vendor: 'Apple Inc.', renderer: 'Apple GPU' },
    gpu: { vendor: 'apple', architecture: 'apple-gpu', device: 'a15-gpu', description: 'Apple GPU', isFallbackAdapter: false },
  },
  {
    model: 'iPhone 11',
    screen: { width: 414, height: 896, availWidth: 414, availHeight: 876, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
    hardwareConcurrency: 6,
    webgl: { vendor: 'Apple Inc.', renderer: 'Apple GPU' },
    gpu: { vendor: 'apple', architecture: 'apple-gpu', device: 'a13-gpu', description: 'Apple GPU', isFallbackAdapter: false },
  },
  {
    model: 'iPhone 11 Pro',
    screen: { width: 375, height: 812, availWidth: 375, availHeight: 792, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3 },
    hardwareConcurrency: 6,
    webgl: { vendor: 'Apple Inc.', renderer: 'Apple GPU' },
    gpu: { vendor: 'apple', architecture: 'apple-gpu', device: 'a13-gpu', description: 'Apple GPU', isFallbackAdapter: false },
  },
  {
    model: 'iPhone 11 Pro Max',
    screen: { width: 414, height: 896, availWidth: 414, availHeight: 876, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3 },
    hardwareConcurrency: 6,
    webgl: { vendor: 'Apple Inc.', renderer: 'Apple GPU' },
    gpu: { vendor: 'apple', architecture: 'apple-gpu', device: 'a13-gpu', description: 'Apple GPU', isFallbackAdapter: false },
  },
  {
    model: 'iPhone 12 mini',
    aliases: ['iPhone 13 mini'],
    screen: { width: 375, height: 812, availWidth: 375, availHeight: 792, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3 },
    hardwareConcurrency: 6,
    webgl: { vendor: 'Apple Inc.', renderer: 'Apple GPU' },
    gpu: { vendor: 'apple', architecture: 'apple-gpu', device: 'a14-gpu', description: 'Apple GPU', isFallbackAdapter: false },
  },
  {
    model: 'iPhone 12',
    aliases: ['iPhone 13'],
    screen: { width: 390, height: 844, availWidth: 390, availHeight: 824, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3 },
    hardwareConcurrency: 6,
    webgl: { vendor: 'Apple Inc.', renderer: 'Apple GPU' },
    gpu: { vendor: 'apple', architecture: 'apple-gpu', device: 'a14-gpu', description: 'Apple GPU', isFallbackAdapter: false },
  },
  {
    model: 'iPhone 12 Pro',
    aliases: ['iPhone 13 Pro'],
    screen: { width: 390, height: 844, availWidth: 390, availHeight: 824, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3 },
    hardwareConcurrency: 6,
    webgl: { vendor: 'Apple Inc.', renderer: 'Apple GPU' },
    gpu: { vendor: 'apple', architecture: 'apple-gpu', device: 'a14-gpu', description: 'Apple GPU', isFallbackAdapter: false },
  },
  {
    model: 'iPhone 12 Pro Max',
    aliases: ['iPhone 13 Pro Max'],
    screen: { width: 430, height: 932, availWidth: 430, availHeight: 912, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3 },
    hardwareConcurrency: 6,
    webgl: { vendor: 'Apple Inc.', renderer: 'Apple GPU' },
    gpu: { vendor: 'apple', architecture: 'apple-gpu', device: 'a14-gpu', description: 'Apple GPU', isFallbackAdapter: false },
  },
  {
    model: 'iPhone 14',
    screen: { width: 390, height: 844, availWidth: 390, availHeight: 824, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3 },
    hardwareConcurrency: 6,
    webgl: { vendor: 'Apple Inc.', renderer: 'Apple GPU' },
    gpu: { vendor: 'apple', architecture: 'apple-gpu', device: 'a15-gpu', description: 'Apple GPU', isFallbackAdapter: false },
  },
  {
    model: 'iPhone 14 Plus',
    screen: { width: 430, height: 932, availWidth: 430, availHeight: 912, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3 },
    hardwareConcurrency: 6,
    webgl: { vendor: 'Apple Inc.', renderer: 'Apple GPU' },
    gpu: { vendor: 'apple', architecture: 'apple-gpu', device: 'a15-gpu', description: 'Apple GPU', isFallbackAdapter: false },
  },
  {
    model: 'iPhone 14 Pro',
    screen: { width: 393, height: 852, availWidth: 393, availHeight: 832, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3 },
    hardwareConcurrency: 6,
    webgl: { vendor: 'Apple Inc.', renderer: 'Apple GPU' },
    gpu: { vendor: 'apple', architecture: 'apple-gpu', device: 'a16-gpu', description: 'Apple GPU', isFallbackAdapter: false },
  },
  {
    model: 'iPhone 14 Pro Max',
    screen: { width: 430, height: 932, availWidth: 430, availHeight: 912, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3 },
    hardwareConcurrency: 6,
    webgl: { vendor: 'Apple Inc.', renderer: 'Apple GPU' },
    gpu: { vendor: 'apple', architecture: 'apple-gpu', device: 'a16-gpu', description: 'Apple GPU', isFallbackAdapter: false },
  },
  {
    model: 'iPhone 15',
    screen: { width: 393, height: 852, availWidth: 393, availHeight: 832, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3 },
    hardwareConcurrency: 6,
    webgl: { vendor: 'Apple Inc.', renderer: 'Apple GPU' },
    gpu: { vendor: 'apple', architecture: 'apple-gpu', device: 'a16-gpu', description: 'Apple GPU', isFallbackAdapter: false },
  },
  {
    model: 'iPhone 15 Plus',
    screen: { width: 430, height: 932, availWidth: 430, availHeight: 912, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3 },
    hardwareConcurrency: 6,
    webgl: { vendor: 'Apple Inc.', renderer: 'Apple GPU' },
    gpu: { vendor: 'apple', architecture: 'apple-gpu', device: 'a16-gpu', description: 'Apple GPU', isFallbackAdapter: false },
  },
  {
    model: 'iPhone 15 Pro',
    screen: { width: 393, height: 852, availWidth: 393, availHeight: 832, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3 },
    hardwareConcurrency: 6,
    webgl: { vendor: 'Apple Inc.', renderer: 'Apple GPU' },
    gpu: { vendor: 'apple', architecture: 'apple-gpu', device: 'a17pro-gpu', description: 'Apple GPU', isFallbackAdapter: false },
  },
  {
    model: 'iPhone 15 Pro Max',
    screen: { width: 430, height: 932, availWidth: 430, availHeight: 912, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3 },
    hardwareConcurrency: 6,
    webgl: { vendor: 'Apple Inc.', renderer: 'Apple GPU' },
    gpu: { vendor: 'apple', architecture: 'apple-gpu', device: 'a17pro-gpu', description: 'Apple GPU', isFallbackAdapter: false },
  },
  {
    model: 'iPhone 16e',
    screen: { width: 390, height: 844, availWidth: 390, availHeight: 824, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3 },
    hardwareConcurrency: 6,
    webgl: { vendor: 'Apple Inc.', renderer: 'Apple GPU' },
    gpu: { vendor: 'apple', architecture: 'apple-gpu', device: 'a18-gpu', description: 'Apple GPU', isFallbackAdapter: false },
  },
  {
    model: 'iPhone 16',
    screen: { width: 393, height: 852, availWidth: 393, availHeight: 832, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3 },
    hardwareConcurrency: 6,
    webgl: { vendor: 'Apple Inc.', renderer: 'Apple GPU' },
    gpu: { vendor: 'apple', architecture: 'apple-gpu', device: 'a18-gpu', description: 'Apple GPU', isFallbackAdapter: false },
  },
  {
    model: 'iPhone 16 Plus',
    screen: { width: 430, height: 932, availWidth: 430, availHeight: 912, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3 },
    hardwareConcurrency: 6,
    webgl: { vendor: 'Apple Inc.', renderer: 'Apple GPU' },
    gpu: { vendor: 'apple', architecture: 'apple-gpu', device: 'a18-gpu', description: 'Apple GPU', isFallbackAdapter: false },
  },
  {
    model: 'iPhone 16 Pro',
    screen: { width: 402, height: 874, availWidth: 402, availHeight: 854, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3 },
    hardwareConcurrency: 6,
    webgl: { vendor: 'Apple Inc.', renderer: 'Apple GPU' },
    gpu: { vendor: 'apple', architecture: 'apple-gpu', device: 'a18pro-gpu', description: 'Apple GPU', isFallbackAdapter: false },
  },
  {
    model: 'iPhone 16 Pro Max',
    screen: { width: 440, height: 956, availWidth: 440, availHeight: 936, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3 },
    hardwareConcurrency: 6,
    webgl: { vendor: 'Apple Inc.', renderer: 'Apple GPU' },
    gpu: { vendor: 'apple', architecture: 'apple-gpu', device: 'a18pro-gpu', description: 'Apple GPU', isFallbackAdapter: false },
  },
{
  model: 'iPhone XR',
  screen: { width: 414, height: 896, availWidth: 414, availHeight: 876, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
  hardwareConcurrency: 6,
  webgl: { vendor: 'Apple Inc.', renderer: 'Apple GPU' },
  gpu: { vendor: 'apple', architecture: 'apple-gpu', device: 'a12-gpu', description: 'Apple GPU', isFallbackAdapter: false },
},
{
  model: 'iPhone XS',
  screen: { width: 375, height: 812, availWidth: 375, availHeight: 792, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3 },
  hardwareConcurrency: 6,
  webgl: { vendor: 'Apple Inc.', renderer: 'Apple GPU' },
  gpu: { vendor: 'apple', architecture: 'apple-gpu', device: 'a12-gpu', description: 'Apple GPU', isFallbackAdapter: false },
},
{
  model: 'iPhone XS Max',
  screen: { width: 414, height: 896, availWidth: 414, availHeight: 876, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3 },
  hardwareConcurrency: 6,
  webgl: { vendor: 'Apple Inc.', renderer: 'Apple GPU' },
  gpu: { vendor: 'apple', architecture: 'apple-gpu', device: 'a12-gpu', description: 'Apple GPU', isFallbackAdapter: false },
},
{
  model: 'iPhone 13 mini',
  screen: { width: 375, height: 812, availWidth: 375, availHeight: 792, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3 },
  hardwareConcurrency: 6,
  webgl: { vendor: 'Apple Inc.', renderer: 'Apple GPU' },
  gpu: { vendor: 'apple', architecture: 'apple-gpu', device: 'a15-gpu', description: 'Apple GPU', isFallbackAdapter: false },
},
{
  model: 'iPhone 13',
  screen: { width: 390, height: 844, availWidth: 390, availHeight: 824, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3 },
  hardwareConcurrency: 6,
  webgl: { vendor: 'Apple Inc.', renderer: 'Apple GPU' },
  gpu: { vendor: 'apple', architecture: 'apple-gpu', device: 'a15-gpu', description: 'Apple GPU', isFallbackAdapter: false },
},
{
  model: 'iPhone 13 Pro',
  screen: { width: 390, height: 844, availWidth: 390, availHeight: 824, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3 },
  hardwareConcurrency: 6,
  webgl: { vendor: 'Apple Inc.', renderer: 'Apple GPU' },
  gpu: { vendor: 'apple', architecture: 'apple-gpu', device: 'a15-gpu', description: 'Apple GPU', isFallbackAdapter: false },
},
{
  model: 'iPhone 13 Pro Max',
  screen: { width: 428, height: 926, availWidth: 428, availHeight: 906, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 3 },
  hardwareConcurrency: 6,
  webgl: { vendor: 'Apple Inc.', renderer: 'Apple GPU' },
  gpu: { vendor: 'apple', architecture: 'apple-gpu', device: 'a15-gpu', description: 'Apple GPU', isFallbackAdapter: false },
},
{
  model: 'iPad (9th generation)',
  screen: { width: 810, height: 1080, availWidth: 810, availHeight: 1040, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
  hardwareConcurrency: 6,
  webgl: { vendor: 'Apple Inc.', renderer: 'Apple GPU' },
  gpu: { vendor: 'apple', architecture: 'apple-gpu', device: 'a13-gpu', description: 'Apple GPU', isFallbackAdapter: false },
},
{
  model: 'iPad (10th generation)',
  screen: { width: 820, height: 1180, availWidth: 820, availHeight: 1140, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
  hardwareConcurrency: 6,
  webgl: { vendor: 'Apple Inc.', renderer: 'Apple GPU' },
  gpu: { vendor: 'apple', architecture: 'apple-gpu', device: 'a14-gpu', description: 'Apple GPU', isFallbackAdapter: false },
},
{
  model: 'iPad mini (6th generation)',
  screen: { width: 744, height: 1133, availWidth: 744, availHeight: 1093, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
  hardwareConcurrency: 6,
  webgl: { vendor: 'Apple Inc.', renderer: 'Apple GPU' },
  gpu: { vendor: 'apple', architecture: 'apple-gpu', device: 'a15-gpu', description: 'Apple GPU', isFallbackAdapter: false },
},
{
  model: 'iPad Air 11-inch (M2)',
  screen: { width: 820, height: 1180, availWidth: 820, availHeight: 1140, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
  hardwareConcurrency: 8,
  webgl: { vendor: 'Apple Inc.', renderer: 'Apple GPU' },
  gpu: { vendor: 'apple', architecture: 'apple-gpu', device: 'm2-gpu', description: 'Apple GPU', isFallbackAdapter: false },
},
{
  model: 'iPad Air 13-inch (M2)',
  screen: { width: 1024, height: 1366, availWidth: 1024, availHeight: 1326, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
  hardwareConcurrency: 8,
  webgl: { vendor: 'Apple Inc.', renderer: 'Apple GPU' },
  gpu: { vendor: 'apple', architecture: 'apple-gpu', device: 'm2-gpu', description: 'Apple GPU', isFallbackAdapter: false },
},
{
  model: 'iPad Air 11-inch (M3)',
  screen: { width: 820, height: 1180, availWidth: 820, availHeight: 1140, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
  hardwareConcurrency: 8,
  webgl: { vendor: 'Apple Inc.', renderer: 'Apple GPU' },
  gpu: { vendor: 'apple', architecture: 'apple-gpu', device: 'm3-gpu', description: 'Apple GPU', isFallbackAdapter: false },
},
{
  model: 'iPad Air 13-inch (M3)',
  screen: { width: 1024, height: 1366, availWidth: 1024, availHeight: 1326, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
  hardwareConcurrency: 8,
  webgl: { vendor: 'Apple Inc.', renderer: 'Apple GPU' },
  gpu: { vendor: 'apple', architecture: 'apple-gpu', device: 'm3-gpu', description: 'Apple GPU', isFallbackAdapter: false },
},
{
  model: 'iPad Pro 11-inch (M4)',
  screen: { width: 834, height: 1194, availWidth: 834, availHeight: 1154, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
  hardwareConcurrency: 10,
  webgl: { vendor: 'Apple Inc.', renderer: 'Apple GPU' },
  gpu: { vendor: 'apple', architecture: 'apple-gpu', device: 'm4-gpu', description: 'Apple GPU', isFallbackAdapter: false },
},
{
  model: 'iPad Pro 12.9-inch (6th generation)',
  screen: { width: 1024, height: 1366, availWidth: 1024, availHeight: 1326, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
  hardwareConcurrency: 8,
  webgl: { vendor: 'Apple Inc.', renderer: 'Apple GPU' },
  gpu: { vendor: 'apple', architecture: 'apple-gpu', device: 'm2-gpu', description: 'Apple GPU', isFallbackAdapter: false },
},
{
  model: 'iPad Pro 13-inch (M4)',
  screen: { width: 1032, height: 1376, availWidth: 1032, availHeight: 1336, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
  hardwareConcurrency: 10,
  webgl: { vendor: 'Apple Inc.', renderer: 'Apple GPU' },
  gpu: { vendor: 'apple', architecture: 'apple-gpu', device: 'm4-gpu', description: 'Apple GPU', isFallbackAdapter: false },
},
{
  model: 'iPad 11-inch (A16)',
  screen: { width: 820, height: 1180, availWidth: 820, availHeight: 1140, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
  hardwareConcurrency: 6,
  webgl: { vendor: 'Apple Inc.', renderer: 'Apple GPU' },
  gpu: { vendor: 'apple', architecture: 'apple-gpu', device: 'a16-gpu', description: 'Apple GPU', isFallbackAdapter: false },
},
{
  model: 'iPad mini (A17 Pro)',
  aliases: ['iPad mini 7'],
  screen: { width: 744, height: 1133, availWidth: 744, availHeight: 1093, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
  hardwareConcurrency: 6,
  webgl: { vendor: 'Apple Inc.', renderer: 'Apple GPU' },
  gpu: { vendor: 'apple', architecture: 'apple-gpu', device: 'a17pro-gpu', description: 'Apple GPU', isFallbackAdapter: false },
},
{
  model: 'iPad Air 11-inch (M4)',
  screen: { width: 820, height: 1180, availWidth: 820, availHeight: 1140, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
  hardwareConcurrency: 8,
  webgl: { vendor: 'Apple Inc.', renderer: 'Apple GPU' },
  gpu: { vendor: 'apple', architecture: 'apple-gpu', device: 'm4-gpu', description: 'Apple GPU', isFallbackAdapter: false },
},
{
  model: 'iPad Air 13-inch (M4)',
  screen: { width: 1024, height: 1366, availWidth: 1024, availHeight: 1326, colorDepth: 24, pixelDepth: 24, devicePixelRatio: 2 },
  hardwareConcurrency: 8,
  webgl: { vendor: 'Apple Inc.', renderer: 'Apple GPU' },
  gpu: { vendor: 'apple', architecture: 'apple-gpu', device: 'm4-gpu', description: 'Apple GPU', isFallbackAdapter: false },
},

]

const normalizeCatalogKey = (value: string): string => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '')

const findAndroidDeviceRecord = (ua: ReadonlyUserAgentState): AndroidDeviceRecord | undefined => {
  const model = ua.device?.model
  if (!model) return undefined
  const key = normalizeCatalogKey(model)
  return androidDeviceCatalog.find((device) => normalizeCatalogKey(device.model) === key || device.aliases?.some((alias) => normalizeCatalogKey(alias) === key))
}

const findIosDeviceRecord = (ua: ReadonlyUserAgentState): IOSDeviceRecord | undefined => {
  const model = ua.device?.model
  if (!model) return undefined
  const key = normalizeCatalogKey(model)
  return iosDeviceCatalog.find((device) => normalizeCatalogKey(device.model) === key || device.aliases?.some((alias) => normalizeCatalogKey(alias) === key))
}

const androidGpu: readonly GPUPreset[] = [
{ vendor: 'qualcomm', architecture: 'adreno-619', device: 'sm6375', description: 'Qualcomm Adreno 619', isFallbackAdapter: false },
{ vendor: 'qualcomm', architecture: 'adreno-642l', device: 'sm7325', description: 'Qualcomm Adreno 642L', isFallbackAdapter: false },
{ vendor: 'qualcomm', architecture: 'adreno-710', device: 'sm7435', description: 'Qualcomm Adreno 710', isFallbackAdapter: false },
{ vendor: 'qualcomm', architecture: 'adreno-730', device: 'sm8450', description: 'Qualcomm Adreno 730', isFallbackAdapter: false },
{ vendor: 'qualcomm', architecture: 'adreno-740', device: 'sm8550', description: 'Qualcomm Adreno 740', isFallbackAdapter: false },
{ vendor: 'qualcomm', architecture: 'adreno-750', device: 'sm8650', description: 'Qualcomm Adreno 750', isFallbackAdapter: false },
{ vendor: 'qualcomm', architecture: 'adreno-830', device: 'sm8750', description: 'Qualcomm Adreno 830', isFallbackAdapter: false },
{ vendor: 'arm', architecture: 'bifrost', device: 'mali-g52', description: 'ARM Mali-G52', isFallbackAdapter: false },
{ vendor: 'arm', architecture: 'valhall', device: 'mali-g68', description: 'ARM Mali-G68', isFallbackAdapter: false },
{ vendor: 'arm', architecture: 'valhall', device: 'mali-g78', description: 'ARM Mali-G78', isFallbackAdapter: false },
{ vendor: 'arm', architecture: 'valhall', device: 'mali-g710', description: 'ARM Mali-G710', isFallbackAdapter: false },
{ vendor: 'arm', architecture: 'valhall', device: 'mali-g715', description: 'ARM Mali-G715', isFallbackAdapter: false },
{ vendor: 'arm', architecture: 'valhall', device: 'mali-g720', description: 'ARM Mali-G720', isFallbackAdapter: false },
{ vendor: 'qualcomm', architecture: 'adreno-620', device: 'sm6350', description: 'Qualcomm Adreno 620', isFallbackAdapter: false },
{ vendor: 'qualcomm', architecture: 'adreno-630', device: 'sdm845', description: 'Qualcomm Adreno 630', isFallbackAdapter: false },
{ vendor: 'qualcomm', architecture: 'adreno-640', device: 'sm8150', description: 'Qualcomm Adreno 640', isFallbackAdapter: false },
{ vendor: 'qualcomm', architecture: 'adreno-650', device: 'sm8250', description: 'Qualcomm Adreno 650', isFallbackAdapter: false },
{ vendor: 'qualcomm', architecture: 'adreno-660', device: 'sm8350', description: 'Qualcomm Adreno 660', isFallbackAdapter: false },
{ vendor: 'arm', architecture: 'valhall', device: 'mali-g57', description: 'ARM Mali-G57', isFallbackAdapter: false },
{ vendor: 'arm', architecture: 'valhall', device: 'mali-g76', description: 'ARM Mali-G76', isFallbackAdapter: false },
{ vendor: 'arm', architecture: 'valhall', device: 'mali-g77', description: 'ARM Mali-G77', isFallbackAdapter: false },
{ vendor: 'arm', architecture: 'valhall', device: 'mali-g610', description: 'ARM Mali-G610', isFallbackAdapter: false },
{ vendor: 'arm', architecture: 'valhall', device: 'mali-g615', description: 'ARM Mali-G615', isFallbackAdapter: false },

]

const iosGpu: readonly GPUPreset[] = [
{ vendor: 'apple', architecture: 'apple-gpu', device: 'iphone-gpu', description: 'Apple GPU', isFallbackAdapter: false },
{ vendor: 'apple', architecture: 'apple-gpu', device: 'iphone-pro-gpu', description: 'Apple GPU', isFallbackAdapter: false },
{ vendor: 'apple', architecture: 'apple-gpu', device: 'ipad-gpu', description: 'Apple GPU', isFallbackAdapter: false },
{ vendor: 'apple', architecture: 'apple-gpu', device: 'ipad-pro-gpu', description: 'Apple GPU', isFallbackAdapter: false },
]

const mobileLanguages = ['en-US', 'en-GB', 'de-DE', 'fr-FR', 'es-ES', 'it-IT', 'pl-PL']
const desktopLanguages = ['en-US', 'en-GB', 'de-DE', 'fr-FR', 'es-ES', 'it-IT', 'pl-PL', 'nl-NL']

// Mulberry32 seeded PRNG — used for font subset selection (and re-exported for other callers)
export const mulberry32 = (seed: number): (() => number) => {
  let s = seed >>> 0
  return () => {
    s += 0x6d2b79f5
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000
  }
}

// Seeded Fisher-Yates shuffle — mutates in place, returns array
const fisherYates = <T>(arr: T[], rng: () => number): T[] => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

const windowsCoreFonts = [
  'Arial', 'Calibri', 'Cambria', 'Consolas', 'Courier New', 'Segoe UI', 'Segoe UI Emoji', 'Tahoma', 'Times New Roman', 'Verdana',
]

const windowsFonts = [
  'Arial', 'Arial Black', 'Arial Narrow', 'Arial Nova', 'Aptos', 'Aptos Display',
  'Bahnschrift', 'Calibri', 'Calibri Light', 'Cambria', 'Cambria Math', 'Candara',
  'Cascadia Code', 'Cascadia Mono', 'Comic Sans MS', 'Consolas', 'Constantia',
  'Corbel', 'Courier New', 'Ebrima', 'Franklin Gothic Medium', 'Gabriola', 'Gadugi',
  'Georgia', 'Gentium Book Basic', 'Impact', 'Ink Free', 'Javanese Text', 'KACSTOffice', 'Leelawadee UI', 'Lucida Console',
  'Lucida Sans Unicode', 'Malgun Gothic', 'Marlett', 'Microsoft Himalaya',
  'Microsoft JhengHei', 'Microsoft New Tai Lue', 'Microsoft PhagsPa',
  'Microsoft Sans Serif', 'Microsoft Tai Le', 'Microsoft YaHei', 'MingLiU-ExtB',
  'Mongolian Baiti', 'MS Gothic', 'MS Outlook', 'MV Boli', 'Myanmar Text', 'Nirmala UI',
  'NSimSun', 'OpenSymbol', 'Palatino Linotype', 'Segoe Fluent Icons', 'Segoe MDL2 Assets',
  'Segoe Print', 'Segoe Script', 'Segoe UI', 'Segoe UI Emoji', 'Segoe UI Historic',
  'Segoe UI Symbol', 'Segoe UI Variable', 'Segoe UI Variable Display', 'Segoe UI Variable Text',
  'SimSun', 'Sitka', 'Source Code Pro', 'Sylfaen', 'Symbol', 'Tahoma', 'Times New Roman',
  'Trebuchet MS', 'Verdana', 'Webdings', 'Wingdings', 'Yu Gothic', 'Yu Gothic UI', 'ZWAdobeF',
]

const linuxCoreFonts = [
  'DejaVu Sans', 'DejaVu Sans Mono', 'Liberation Sans', 'Liberation Mono', 'Noto Sans', 'Noto Color Emoji',
]

const linuxFonts = [
  'Amiri', 'Arimo', 'Bitstream Charter', 'Bitstream Vera Sans', 'Bitstream Vera Serif',
  'Cantarell', 'Cousine', 'DejaVu Math TeX Gyre', 'DejaVu Sans',
  'DejaVu Sans Condensed', 'DejaVu Sans Mono', 'DejaVu Serif',
  'DejaVu Serif Condensed', 'Droid Sans', 'Droid Sans Mono',
  'FreeMono', 'FreeSans', 'FreeSerif', 'Gentium Book Basic', 'Inter', 'JetBrains Mono',
  'KACSTOffice', 'Liberation Mono', 'Liberation Sans', 'Liberation Sans Narrow', 'Liberation Serif',
  'Linux Biolinum O', 'Linux Libertine Display O', 'Linux Libertine O',
  'Noto Color Emoji', 'Noto Mono', 'Noto Naskh Arabic', 'Noto Sans', 'Noto Sans Arabic',
  'Noto Sans CJK SC', 'Noto Sans JP', 'Noto Sans KR', 'Noto Sans Mono',
  'Noto Sans Symbols', 'Noto Sans Symbols 2', 'Noto Serif', 'Noto Serif CJK SC',
  'OpenSymbol', 'Roboto', 'Roboto Condensed', 'Source Code Pro', 'Source Sans 3',
  'Source Serif 4', 'Tinos', 'Ubuntu', 'Ubuntu Condensed', 'Ubuntu Light', 'Ubuntu Mono',
  'Unifont', 'URW Bookman', 'URW Gothic', 'ZWAdobeF',
]

const macCoreFonts = [
  'Apple Color Emoji', 'Helvetica', 'Helvetica Neue', 'Menlo', 'SF Pro Display', 'SF Pro Text',
]

const macFonts = [
  'Al Nile', 'American Typewriter', 'Andale Mono', 'Apple Braille',
  'Apple Chancery', 'Apple Color Emoji', 'Apple SD Gothic Neo', 'Apple Symbols',
  'AppleMyungjo', 'Arial', 'Arial Black', 'Arial Hebrew', 'Arial Narrow',
  'Arial Rounded MT Bold', 'Arial Unicode MS', 'Avenir', 'Avenir Next',
  'Avenir Next Condensed', 'Baskerville', 'Big Caslon', 'Bodoni 72',
  'Brush Script MT', 'Chalkboard SE', 'Charter', 'Cochin', 'Comic Sans MS',
  'Copperplate', 'Courier', 'Courier New', 'Didot', 'Futura', 'Geeza Pro',
  'Geneva', 'Gentium Book Basic', 'Georgia', 'Gill Sans', 'Helvetica', 'Helvetica Neue',
  'Herculanum', 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Hoefler Text', 'Impact', 'KACSTOffice', 'Kailasa',
  'Khmer Sangam MN', 'Kohinoor Bangla', 'Kohinoor Devanagari', 'Kohinoor Gujarati', 'Lucida Grande',
  'Malayalam Sangam MN', 'Marker Felt', 'Menlo', 'Monaco', 'MS Outlook', 'New York', 'OpenSymbol', 'Optima', 'Palatino',
  'Papyrus', 'PingFang HK', 'PingFang SC', 'PingFang TC', 'SF Arabic', 'SF Armenian',
  'SF Compact', 'SF Georgian', 'SF Hebrew', 'SF Mono', 'SF Pro Display',
  'SF Pro Rounded', 'SF Pro Text', 'Skia', 'Songti SC', 'Source Code Pro', 'STHeiti', 'Snell Roundhand',
  'Symbol', 'Tahoma', 'Thonburi', 'Times', 'Times New Roman', 'Trebuchet MS', 'Verdana',
  'Zapf Dingbats', 'Zapfino', 'ZWAdobeF',
]

const iosCoreFonts = [
  'Apple Color Emoji', 'Helvetica', 'Helvetica Neue', 'SF Pro Display', 'SF Pro Text',
]

const iosFonts = [
  'Academy Engraved LET', 'Al Nile', 'American Typewriter', 'Apple Color Emoji',
  'Apple SD Gothic Neo', 'Arial', 'Arial Hebrew', 'Arial Rounded MT Bold',
  'Avenir', 'Avenir Next', 'Avenir Next Condensed', 'Baskerville',
  'Bodoni 72', 'Bradley Hand', 'Chalkboard SE', 'Cochin', 'Copperplate',
  'Courier', 'Courier New', 'Damascus', 'Devanagari Sangam MN',
  'Didot', 'Futura', 'Georgia', 'Geeza Pro', 'Gill Sans', 'Helvetica', 'Helvetica Neue',
  'Hiragino Mincho ProN', 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Hoefler Text',
  'Kefa', 'Khmer Sangam MN', 'Kohinoor Bangla', 'Kohinoor Devanagari', 'Kohinoor Gujarati',
  'Kohinoor Telugu', 'Lao Sangam MN', 'Malayalam Sangam MN', 'Marker Felt', 'Menlo', 'Mishafi',
  'New York', 'Noteworthy', 'Optima', 'Palatino', 'Papyrus', 'Party LET',
  'PingFang HK', 'PingFang SC', 'PingFang TC', 'Rockwell', 'SF Arabic', 'SF Armenian',
  'SF Compact', 'SF Georgian', 'SF Hebrew', 'SF Mono', 'SF Pro Display', 'SF Pro Rounded', 'SF Pro Text', 'Savoye LET',
  'Sinhala Sangam MN', 'Snell Roundhand', 'Symbol', 'Tamil Sangam MN',
  'Thonburi', 'Times New Roman', 'Trebuchet MS', 'Verdana', 'Zapf Dingbats', 'Zapfino',
]

const androidCoreFonts = [
  'Noto Color Emoji', 'Noto Sans', 'Roboto', 'Roboto Condensed', 'Roboto Medium',
]

const androidFonts = [
  'Carrois Gothic SC', 'Coming Soon', 'Cutive Mono', 'Dancing Script',
  'Droid Sans', 'Droid Sans Mono', 'Droid Serif', 'Noto Color Emoji', 'Noto Emoji',
  'Noto Naskh Arabic', 'Noto Sans', 'Noto Sans Arabic', 'Noto Sans Armenian',
  'Noto Sans Bengali', 'Noto Sans CJK', 'Noto Sans Devanagari', 'Noto Sans Georgian',
  'Noto Sans Hebrew', 'Noto Sans Japanese', 'Noto Sans Kannada', 'Noto Sans Khmer',
  'Noto Sans KR', 'Noto Sans Lao', 'Noto Sans Malayalam', 'Noto Sans Myanmar',
  'Noto Sans Sinhala', 'Noto Sans Tamil', 'Noto Sans Telugu', 'Noto Sans Thai',
  'Noto Sans Symbols', 'Noto Sans Symbols 2', 'Noto Serif', 'Noto Serif CJK',
  'Roboto', 'Roboto Black', 'Roboto Condensed', 'Roboto Flex', 'Roboto Light',
  'Roboto Medium', 'Roboto Mono', 'Roboto Serif', 'Roboto Slab', 'Roboto Thin',
]

// Realistic exposed subset sizes per OS (range: [min, max])
const fontSubsetRange: Record<string, [number, number]> = {
  windows: [28, 46],
  linux:   [16, 30],
  macOS:   [24, 40],
  iOS:     [18, 32],
  android: [12, 24],
}


const desktopAppFontBundles: Readonly<Record<'windows' | 'linux' | 'macOS', readonly (readonly string[])[]>> = {
  windows: [
    ['MS Outlook'],
    ['ZWAdobeF'],
    ['Amiri', 'KACSTOffice', 'Liberation Mono', 'Source Code Pro'],
    ['DejaVu Sans', 'Gentium Book Basic', 'OpenSymbol'],
  ],
  linux: [
    ['Amiri', 'KACSTOffice', 'Liberation Mono', 'Source Code Pro'],
    ['DejaVu Sans', 'Gentium Book Basic', 'OpenSymbol'],
    ['ZWAdobeF'],
  ],
  macOS: [
    ['ZWAdobeF'],
    ['MS Outlook'],
    ['Amiri', 'KACSTOffice', 'Liberation Mono', 'Source Code Pro'],
  ],
}

const buildFonts = (ua: ReadonlyUserAgentState, seed: number): FingerprintProfile['fonts'] => {
  const allFamilies = (() => {
    switch (ua.os) {
      case 'windows': return windowsFonts
      case 'linux':   return linuxFonts
      case 'macOS':   return macFonts
      case 'iOS':     return iosFonts
      case 'android': return androidFonts
      default:        return windowsFonts
    }
  })()

  const coreFamilies = (() => {
    switch (ua.os) {
      case 'windows': return windowsCoreFonts
      case 'linux':   return linuxCoreFonts
      case 'macOS':   return macCoreFonts
      case 'iOS':     return iosCoreFonts
      case 'android': return androidCoreFonts
      default:        return windowsCoreFonts
    }
  })()

  const [minCount, maxCount] = fontSubsetRange[ua.os] ?? [10, 20]
  const rng = mulberry32(seed ^ 0xf07f5eed)
  const appBundles = (ua.os === 'windows' || ua.os === 'linux' || ua.os === 'macOS')
    ? desktopAppFontBundles[ua.os]
    : []
  const chosenBundleFonts = appBundles
    .filter(() => rng() > 0.62)
    .flat()
  const baseFamilies = [...new Set([...coreFamilies, ...chosenBundleFonts])]
  const extraFamilies = fisherYates(allFamilies.filter((family) => !baseFamilies.includes(family)), rng)
  const targetCount = minCount + Math.floor(rng() * (maxCount - minCount + 1))
  const merged = [...baseFamilies, ...extraFamilies]
  return { families: merged.slice(0, Math.min(Math.max(targetCount, baseFamilies.length), merged.length)) }
}

const languageChain = (primary: string): string[] => {
  const base = primary.split('-')[0]
  // deduplicate preserving order — e.g. 'en-US' → ['en-US','en'], not ['en-US','en','en-US','en']
  const raw = primary === base ? [primary] : [primary, base]
  return [...new Set(raw)]
}


// platformVersionFor imported from ua-ch.ts — single source of truth

const buildMediaDevices = (ua: ReadonlyUserAgentState, seed: number): FingerprintProfile['mediaDevices'] => {
  const baseGroup = shortId(`${seed}|group|default`)
  const groupId = (suffix: string): string => `${baseGroup}-${suffix}`
  const deviceId = (kind: string, index: number): string => `${kind}-${shortId(`${seed}|${kind}|${index}`)}`
  const list: MediaDevicePreset[] = []
  const rng = mulberry32(seed ^ 0x5aa5f00d)

  if (ua.os === 'android' || ua.os === 'iOS') {
    const isTablet = ua.device?.type === 'tablet'
    const audioBase = ua.os === 'iOS'
      ? (isTablet ? 'iPad microphone' : 'iPhone microphone')
      : (isTablet ? 'Tablet microphone array' : 'Phone microphone')
    const speakerLabel = ua.os === 'iOS'
      ? (isTablet ? 'iPad speakers' : 'iPhone speakers')
      : (isTablet ? 'Tablet speakers' : 'Phone speaker')

    list.push({ kind: 'audioinput', label: audioBase, deviceId: deviceId('audioinput', 0), groupId: groupId('mobile-audio') })
    list.push({ kind: 'audiooutput', label: speakerLabel, deviceId: deviceId('audiooutput', 0), groupId: groupId('mobile-audio') })
    list.push({ kind: 'videoinput', label: 'Front camera', deviceId: deviceId('videoinput', 0), groupId: groupId('front-camera') })
    list.push({ kind: 'videoinput', label: 'Back camera', deviceId: deviceId('videoinput', 1), groupId: groupId('rear-camera') })

    if (rng() > 0.42) list.push({ kind: 'videoinput', label: 'Ultra wide camera', deviceId: deviceId('videoinput', 2), groupId: groupId('rear-camera') })
    if (rng() > 0.58) list.push({ kind: 'videoinput', label: 'Telephoto camera', deviceId: deviceId('videoinput', 3), groupId: groupId('rear-camera') })
    if (rng() > 0.74) list.push({ kind: 'videoinput', label: 'Macro camera', deviceId: deviceId('videoinput', 4), groupId: groupId('rear-camera') })
    if (rng() > 0.52) list.push({ kind: 'audiooutput', label: ua.os === 'iOS' ? 'AirPods' : 'Bluetooth audio', deviceId: deviceId('audiooutput', 1), groupId: groupId('bt-audio') })
    if (rng() > 0.61) list.push({ kind: 'audioinput', label: ua.os === 'iOS' ? 'AirPods microphone' : 'Bluetooth headset microphone', deviceId: deviceId('audioinput', 1), groupId: groupId('bt-audio') })

    return list
  }

  const defaultMic = ua.os === 'macOS'
    ? 'MacBook Pro Microphone'
    : ua.os === 'windows'
      ? 'Microphone Array (Realtek(R) Audio)'
      : 'Built-in Audio Analog Stereo'
  const defaultSpeakers = ua.os === 'macOS'
    ? 'MacBook Pro Speakers'
    : ua.os === 'windows'
      ? 'Speakers (Realtek(R) Audio)'
      : 'Built-in Audio Analog Stereo'
  const defaultCam = ua.os === 'macOS'
    ? 'FaceTime HD Camera'
    : ua.os === 'windows'
      ? 'Integrated Camera'
      : 'HD Web Camera'

  list.push({ kind: 'audioinput', label: defaultMic, deviceId: deviceId('audioinput', 0), groupId: groupId('desktop-audio') })
  list.push({ kind: 'audiooutput', label: defaultSpeakers, deviceId: deviceId('audiooutput', 0), groupId: groupId('desktop-audio') })
  list.push({ kind: 'videoinput', label: defaultCam, deviceId: deviceId('videoinput', 0), groupId: groupId('webcam') })

  if (rng() > 0.28) {
    list.push({ kind: 'audiooutput', label: ua.os === 'windows' ? 'Headphones (High Definition Audio Device)' : 'Headphones', deviceId: deviceId('audiooutput', 1), groupId: groupId('headset') })
    list.push({ kind: 'audioinput', label: ua.os === 'windows' ? 'Headset Microphone (High Definition Audio Device)' : 'Headset microphone', deviceId: deviceId('audioinput', 1), groupId: groupId('headset') })
  }
  if (rng() > 0.47) list.push({ kind: 'videoinput', label: ua.os === 'windows' ? 'HD Pro Webcam C920' : ua.os === 'macOS' ? 'USB Camera' : 'USB Camera', deviceId: deviceId('videoinput', 1), groupId: groupId('usb-camera') })
  if (rng() > 0.55) list.push({ kind: 'audiooutput', label: ua.os === 'windows' ? 'Monitor (NVIDIA High Definition Audio)' : ua.os === 'macOS' ? 'Display Audio' : 'HDMI / DisplayPort 3', deviceId: deviceId('audiooutput', 2), groupId: groupId('display-audio') })
  if (rng() > 0.66) list.push({ kind: 'audioinput', label: ua.os === 'windows' ? 'Microphone (USB Audio Device)' : ua.os === 'macOS' ? 'USB Microphone' : 'USB PnP Sound Device', deviceId: deviceId('audioinput', 2), groupId: groupId('usb-mic') })
  if (rng() > 0.73) list.push({ kind: 'audiooutput', label: ua.os === 'windows' ? 'Bluetooth Headset (Hands-Free AG Audio)' : 'Bluetooth Headphones', deviceId: deviceId('audiooutput', 3), groupId: groupId('bt-audio') })
  if (rng() > 0.78) list.push({ kind: 'audioinput', label: ua.os === 'windows' ? 'Bluetooth Headset Microphone' : 'Bluetooth microphone', deviceId: deviceId('audioinput', 3), groupId: groupId('bt-audio') })

  return list
}

const languageTimezones: Readonly<Record<string, readonly string[]>> = {
  'en-US': ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Phoenix'],
  'en-GB': ['Europe/London'],
  'de-DE': ['Europe/Berlin'],
  'fr-FR': ['Europe/Paris'],
  'es-ES': ['Europe/Madrid'],
  'it-IT': ['Europe/Rome'],
  'pl-PL': ['Europe/Warsaw'],
  'nl-NL': ['Europe/Amsterdam'],
  'en': ['America/New_York', 'Europe/London', 'Australia/Sydney'],
}

const buildTimezoneZone = (language: string, seed: number): string => {
  const key = language.split('-').slice(0, 2).join('-')
  const list = languageTimezones[key] ?? languageTimezones['en-US']
  return list[seed % list.length]
}

// ---------------------------------------------------------------------------
// GPU Capability Model — WebGPU features / limits / WGSL flags
// Per-vendor, not a single shared blob.
// ---------------------------------------------------------------------------

type GpuCapabilityPreset = FingerprintProfile['gpuCapability']

// Features available on Intel Gen12 (Xe) under D3D12/Vulkan
const intelDesktopFeatures: string[] = [
  'depth-clip-control',
  'depth32float-stencil8',
  'texture-compression-bc',
  'indirect-first-instance',
  'rg11b10ufloat-renderable',
  'bgra8unorm-storage',
  'float32-filterable',
]

// NVIDIA Ampere adds shader-f16 and more compute headroom
const nvidiaDesktopFeatures: string[] = [
  ...intelDesktopFeatures,
  'shader-f16',
  'dual-source-blending',
]

// AMD RDNA2 similar to NVIDIA on Vulkan
const amdDesktopFeatures: string[] = [
  ...intelDesktopFeatures,
  'shader-f16',
  'dual-source-blending',
]

// Apple Silicon (M1/M2/M3) via Metal
const appleDesktopFeatures: string[] = [
  'depth-clip-control',
  'depth32float-stencil8',
  'texture-compression-bc',
  'texture-compression-etc2',
  'texture-compression-astc',
  'indirect-first-instance',
  'shader-f16',
  'rg11b10ufloat-renderable',
  'bgra8unorm-storage',
  'float32-filterable',
]

// Qualcomm Adreno 7xx (Android)
const adrenoMobileFeatures: string[] = [
  'depth-clip-control',
  'texture-compression-etc2',
  'texture-compression-astc',
  'indirect-first-instance',
  'rg11b10ufloat-renderable',
  'shader-f16',
]

// ARM Mali-G7xx (Android)
const maliMobileFeatures: string[] = [
  'depth-clip-control',
  'texture-compression-etc2',
  'texture-compression-astc',
  'indirect-first-instance',
  'rg11b10ufloat-renderable',
]

// Apple GPU (iOS)
const appleIosFeatures: string[] = [
  'depth-clip-control',
  'depth32float-stencil8',
  'texture-compression-etc2',
  'texture-compression-astc',
  'indirect-first-instance',
  'shader-f16',
  'rg11b10ufloat-renderable',
  'bgra8unorm-storage',
]

// Base desktop limits (Intel conservative)
const intelDesktopLimits: Record<string, number> = {
  maxTextureDimension1D: 8192,
  maxTextureDimension2D: 8192,
  maxTextureDimension3D: 2048,
  maxTextureArrayLayers: 256,
  maxBindGroups: 4,
  maxBindingsPerBindGroup: 640,
  maxDynamicUniformBuffersPerPipelineLayout: 8,
  maxDynamicStorageBuffersPerPipelineLayout: 4,
  maxSampledTexturesPerShaderStage: 16,
  maxSamplersPerShaderStage: 16,
  maxStorageBuffersPerShaderStage: 8,
  maxStorageTexturesPerShaderStage: 4,
  maxUniformBuffersPerShaderStage: 12,
  maxUniformBufferBindingSize: 65536,
  maxStorageBufferBindingSize: 134217728,
  minUniformBufferOffsetAlignment: 256,
  minStorageBufferOffsetAlignment: 256,
  maxVertexBuffers: 8,
  maxBufferSize: 268435456,
  maxVertexAttributes: 16,
  maxVertexBufferArrayStride: 2048,
  maxInterStageShaderComponents: 60,
  maxColorAttachments: 8,
  maxColorAttachmentBytesPerSample: 32,
  maxComputeWorkgroupStorageSize: 16384,
  maxComputeInvocationsPerWorkgroup: 256,
  maxComputeWorkgroupSizeX: 256,
  maxComputeWorkgroupSizeY: 256,
  maxComputeWorkgroupSizeZ: 64,
  maxComputeWorkgroupsPerDimension: 65535,
}

// NVIDIA/AMD can go higher on storage and buffer sizes
const nvidiaDesktopLimits: Record<string, number> = {
  ...intelDesktopLimits,
  maxStorageBufferBindingSize: 2147483648,
  maxBufferSize: 2147483648,
  maxComputeWorkgroupStorageSize: 32768,
  maxComputeInvocationsPerWorkgroup: 1024,
  maxComputeWorkgroupSizeX: 1024,
  maxComputeWorkgroupSizeY: 1024,
}

const amdDesktopLimits: Record<string, number> = {
  ...intelDesktopLimits,
  maxStorageBufferBindingSize: 2147483648,
  maxBufferSize: 2147483648,
  maxComputeWorkgroupStorageSize: 32768,
  maxComputeInvocationsPerWorkgroup: 1024,
  maxComputeWorkgroupSizeX: 1024,
  maxComputeWorkgroupSizeY: 1024,
}

const appleDesktopLimits: Record<string, number> = {
  ...intelDesktopLimits,
  maxTextureDimension1D: 16384,
  maxTextureDimension2D: 16384,
  maxStorageBufferBindingSize: 2147483648,
  maxBufferSize: 2147483648,
  maxComputeWorkgroupStorageSize: 32768,
  maxComputeInvocationsPerWorkgroup: 1024,
}

const adrenoMobileLimits: Record<string, number> = {
  ...intelDesktopLimits,
  maxTextureDimension1D: 8192,
  maxTextureDimension2D: 8192,
  maxUniformBufferBindingSize: 16384,
  maxStorageBufferBindingSize: 134217728,
  maxBufferSize: 268435456,
  maxComputeWorkgroupStorageSize: 32768,
  maxComputeInvocationsPerWorkgroup: 1024,
  maxComputeWorkgroupSizeX: 1024,
  maxComputeWorkgroupSizeY: 1024,
}

const maliMobileLimits: Record<string, number> = {
  ...intelDesktopLimits,
  maxTextureDimension1D: 4096,
  maxTextureDimension2D: 4096,
  maxUniformBufferBindingSize: 16384,
  maxStorageBufferBindingSize: 67108864,
  maxBufferSize: 134217728,
  maxComputeWorkgroupStorageSize: 16384,
  maxComputeInvocationsPerWorkgroup: 512,
  maxComputeWorkgroupSizeX: 512,
  maxComputeWorkgroupSizeY: 512,
}

const appleIosLimits: Record<string, number> = {
  ...intelDesktopLimits,
  maxTextureDimension1D: 8192,
  maxTextureDimension2D: 8192,
  maxStorageBufferBindingSize: 268435456,
  maxBufferSize: 268435456,
  maxComputeWorkgroupStorageSize: 32768,
  maxComputeInvocationsPerWorkgroup: 1024,
}


const buildGpuCapability = (ua: ReadonlyUserAgentState, gpuVendor: string): GpuCapabilityPreset => {
  let features: string[]
  let limits: Record<string, number>
  let wgslLanguageFeatures: string[]
  let preferredCanvasFormat: 'rgba8unorm' | 'bgra8unorm'

  if (ua.os === 'iOS') {
    features = appleIosFeatures
    limits = appleIosLimits
    wgslLanguageFeatures = [
      'readonly_and_readwrite_storage_textures',
      'packed_4x8_integer_dot_product',
      'pointer_composite_access',
    ]
    preferredCanvasFormat = 'bgra8unorm'
  } else if (ua.os === 'android') {
    if (gpuVendor === 'qualcomm') {
      features = adrenoMobileFeatures
      limits = adrenoMobileLimits
      wgslLanguageFeatures = [
        'readonly_and_readwrite_storage_textures',
        'packed_4x8_integer_dot_product',
      ]
    } else {
      // ARM Mali default
      features = maliMobileFeatures
      limits = maliMobileLimits
      wgslLanguageFeatures = [
        'readonly_and_readwrite_storage_textures',
        'packed_4x8_integer_dot_product',
      ]
    }
    preferredCanvasFormat = 'rgba8unorm'
  } else {
    // Desktop
    if (gpuVendor === 'nvidia') {
      features = nvidiaDesktopFeatures
      limits = nvidiaDesktopLimits
    } else if (gpuVendor === 'amd') {
      features = amdDesktopFeatures
      limits = amdDesktopLimits
    } else if (gpuVendor === 'apple') {
      features = appleDesktopFeatures
      limits = appleDesktopLimits
    } else {
      // Intel default
      features = intelDesktopFeatures
      limits = intelDesktopLimits
    }
    wgslLanguageFeatures = [
      'readonly_and_readwrite_storage_textures',
      'packed_4x8_integer_dot_product',
      'unrestricted_pointer_parameters',
      'pointer_composite_access',
    ]
    // Linux używa rgba8unorm, reszta desktopów bgra8unorm
    preferredCanvasFormat = ua.os === 'linux' ? 'rgba8unorm' : 'bgra8unorm'
  }

  return { features, limits, wgslLanguageFeatures, preferredCanvasFormat }
}

// ---------------------------------------------------------------------------
// WebGL Shader Precision Table — per shaderType × precisionType × platform
// ---------------------------------------------------------------------------

// shaderType constants
const GL_FRAGMENT_SHADER = 35632
const GL_VERTEX_SHADER = 35633
// precisionType constants
const GL_LOW_FLOAT    = 0x8df0
const GL_MEDIUM_FLOAT = 0x8df1
const GL_HIGH_FLOAT   = 0x8df2
const GL_LOW_INT      = 0x8df3
const GL_MEDIUM_INT   = 0x8df4
const GL_HIGH_INT     = 0x8df5

type SPFEntry = { rangeMin: number; rangeMax: number; precision: number }

const buildWebGlShaderPrecision = (ua: ReadonlyUserAgentState): FingerprintProfile['webglShaderPrecision'] => {
  const table: Record<string, SPFEntry> = {}
  const isMobile = ua.os === 'android' || ua.os === 'iOS'

  // Desktop: both vertex and fragment have full IEEE-754 single precision for all float types
  const desktopProfile: Array<[number, number, SPFEntry]> = [
    [GL_VERTEX_SHADER,   GL_LOW_FLOAT,    { rangeMin: 127, rangeMax: 127, precision: 23 }],
    [GL_VERTEX_SHADER,   GL_MEDIUM_FLOAT, { rangeMin: 127, rangeMax: 127, precision: 23 }],
    [GL_VERTEX_SHADER,   GL_HIGH_FLOAT,   { rangeMin: 127, rangeMax: 127, precision: 23 }],
    [GL_VERTEX_SHADER,   GL_LOW_INT,      { rangeMin: 31,  rangeMax: 30,  precision: 0  }],
    [GL_VERTEX_SHADER,   GL_MEDIUM_INT,   { rangeMin: 31,  rangeMax: 30,  precision: 0  }],
    [GL_VERTEX_SHADER,   GL_HIGH_INT,     { rangeMin: 31,  rangeMax: 30,  precision: 0  }],
    [GL_FRAGMENT_SHADER, GL_LOW_FLOAT,    { rangeMin: 127, rangeMax: 127, precision: 23 }],
    [GL_FRAGMENT_SHADER, GL_MEDIUM_FLOAT, { rangeMin: 127, rangeMax: 127, precision: 23 }],
    [GL_FRAGMENT_SHADER, GL_HIGH_FLOAT,   { rangeMin: 127, rangeMax: 127, precision: 23 }],
    [GL_FRAGMENT_SHADER, GL_LOW_INT,      { rangeMin: 31,  rangeMax: 30,  precision: 0  }],
    [GL_FRAGMENT_SHADER, GL_MEDIUM_INT,   { rangeMin: 31,  rangeMax: 30,  precision: 0  }],
    [GL_FRAGMENT_SHADER, GL_HIGH_INT,     { rangeMin: 31,  rangeMax: 30,  precision: 0  }],
  ]

  // Mobile (Adreno/Mali/Apple GPU):
  // - Vertex shader: mediump and lowp float are still 32-bit (same rangeMin/precision)
  // - Fragment shader: lowp float = 8-bit mantissa (precision 8, range 1)
  //                    mediump float = 10-bit mantissa (precision 10, range 14)
  //                    highp float = full 23-bit (same as desktop) — only on some GPUs
  //                    lowp/mediump int = narrower range on fragment
  const mobileProfile: Array<[number, number, SPFEntry]> = [
    [GL_VERTEX_SHADER,   GL_LOW_FLOAT,    { rangeMin: 127, rangeMax: 127, precision: 23 }],
    [GL_VERTEX_SHADER,   GL_MEDIUM_FLOAT, { rangeMin: 127, rangeMax: 127, precision: 23 }],
    [GL_VERTEX_SHADER,   GL_HIGH_FLOAT,   { rangeMin: 127, rangeMax: 127, precision: 23 }],
    [GL_VERTEX_SHADER,   GL_LOW_INT,      { rangeMin: 31,  rangeMax: 30,  precision: 0  }],
    [GL_VERTEX_SHADER,   GL_MEDIUM_INT,   { rangeMin: 31,  rangeMax: 30,  precision: 0  }],
    [GL_VERTEX_SHADER,   GL_HIGH_INT,     { rangeMin: 31,  rangeMax: 30,  precision: 0  }],
    // Fragment shader — real mobile values differ from desktop here
    [GL_FRAGMENT_SHADER, GL_LOW_FLOAT,    { rangeMin: 1,   rangeMax: 1,   precision: 8  }],
    [GL_FRAGMENT_SHADER, GL_MEDIUM_FLOAT, { rangeMin: 14,  rangeMax: 14,  precision: 10 }],
    [GL_FRAGMENT_SHADER, GL_HIGH_FLOAT,   { rangeMin: 62,  rangeMax: 62,  precision: 23 }],
    [GL_FRAGMENT_SHADER, GL_LOW_INT,      { rangeMin: 7,   rangeMax: 8,   precision: 0  }],
    [GL_FRAGMENT_SHADER, GL_MEDIUM_INT,   { rangeMin: 15,  rangeMax: 16,  precision: 0  }],
    [GL_FRAGMENT_SHADER, GL_HIGH_INT,     { rangeMin: 31,  rangeMax: 30,  precision: 0  }],
  ]

  const chosenProfile = isMobile ? mobileProfile : desktopProfile
  for (const [shaderType, precisionType, entry] of chosenProfile) {
    table[`${shaderType}:${precisionType}`] = entry
  }

  return { table }
}

// ---------------------------------------------------------------------------

export const buildFingerprintProfile = (ua: ReadonlyUserAgentState): FingerprintProfile => {
  const seed = hashString(`${ua.userAgent}|${ua.browser}|${ua.os}|${ua.device?.model || ''}`)
  const language = pick(ua.os === 'android' || ua.os === 'iOS' ? mobileLanguages : desktopLanguages, seed, 7)
  const isTablet = ua.device?.type === 'tablet'
  const isMobile = ua.os === 'android' || ua.os === 'iOS'

  // Device catalogs bind model -> screen / GPU / cores coherently where we know the hardware.
  const androidDevice = ua.os === 'android' ? findAndroidDeviceRecord(ua) : undefined
  const iosDevice = ua.os === 'iOS' ? findIosDeviceRecord(ua) : undefined

  const desktopGpu = (() => {
    switch (ua.os) {
      case 'windows':
        return pick(windowsDesktopGpuCatalog, seed, 71)
      case 'linux':
        return pick(linuxDesktopGpuCatalog, seed, 71)
      case 'macOS':
        return pick(macDesktopGpuCatalog, seed, 71)
      default:
        return pick(windowsDesktopGpuCatalog, seed, 71)
    }
  })()

  const desktopCohort = !isMobile && (ua.os === 'windows' || ua.os === 'linux' || ua.os === 'macOS')
    ? buildDesktopDeviceCohort(ua.os, desktopGpu, seed)
    : undefined

  const screen = (() => {
    if (androidDevice) return androidDevice.screen
    if (iosDevice) return iosDevice.screen
    if (desktopCohort) return desktopCohort.screen
    switch (ua.os) {
      case 'iOS':
        return pick(isTablet ? iosTabletScreens : iosPhoneScreens, seed, 19)
      case 'android':
        return pick(isTablet ? androidTabletScreens : androidMobileScreens, seed, 23)
      default:
        return pick(windowsScreens, seed, 29)
    }
  })()

  const hardwareConcurrency = (() => {
    if (androidDevice) return androidDevice.hardwareConcurrency
    if (iosDevice) return iosDevice.hardwareConcurrency
    if (desktopCohort) return desktopCohort.hardwareConcurrency
    switch (ua.os) {
      case 'android':
        return pick([4, 6, 8, 8, 12], seed, 43)
      case 'iOS':
        return pick([6, 6, 8, 8], seed, 47)
      default:
        return 8
    }
  })()

  const deviceMemory = (() => {
    if (androidDevice) return androidDevice.deviceMemory
    if (desktopCohort) return desktopCohort.deviceMemory
    switch (ua.os) {
      case 'android':
        return pick([4, 6, 8, 8, 12, 16], seed, 67)
      default:
        return undefined
    }
  })()

  const webgl = (() => {
    if (androidDevice) return androidDevice.webgl
    if (iosDevice) return iosDevice.webgl
    switch (ua.os) {
      case 'android':
        return pick(androidWebGl, seed, 71)
      case 'iOS':
        return pick(iosWebGl, seed, 89)
      default:
        return desktopGpu.webgl
    }
  })()

  const gpu = (() => {
    if (androidDevice) return androidDevice.gpu
    if (iosDevice) return iosDevice.gpu
    switch (ua.os) {
      case 'android':
        return pick(androidGpu, seed, 71)
      case 'iOS':
        return pick(iosGpu, seed, 113)
      default:
        return desktopGpu.gpu
    }
  })()

  const platform = (() => {
    switch (ua.os) {
      case 'windows':
        return 'Win32'
      case 'linux':
        return 'Linux x86_64'
      case 'macOS':
        return 'MacIntel'
      case 'android':
        return 'Linux armv8l'
      case 'iOS':
        return isTablet ? 'iPad' : 'iPhone'
      default:
        return ''
    }
  })()

  const vendor = (() => {
    switch (ua.browser) {
      case 'chrome':
      case 'opera':
      case 'edge':
        return 'Google Inc.'
      case 'safari':
        return 'Apple Computer, Inc.'
      case 'firefox':
      default:
        return ''
    }
  })()

  const oscpu = (() => {
    if (ua.browser !== 'firefox') {
      return undefined
    }

    switch (ua.os) {
      case 'windows':
        return 'Windows NT 10.0; Win64; x64'
      case 'linux':
        return 'Linux x86_64'
      case 'macOS':
        return 'Intel Mac OS X 10.15'
      case 'android':
        return 'Linux armv8l'
      case 'iOS':
        return 'Mac OS X'
      default:
        return undefined
    }
  })()

  return {
    language,
    languages: languageChain(language),
    hardwareConcurrency,
    deviceMemory,
    maxTouchPoints: isMobile ? (isTablet ? 10 : 5) : 0,
    pdfViewerEnabled: ua.browser === 'chrome' || ua.browser === 'edge' || ua.browser === 'opera' || ua.browser === 'safari' || ua.browser === 'firefox',
    platform,
    vendor,
    oscpu,
    architecture: architectureFor(ua, gpu.vendor),
    bitness: bitnessFor(ua.os),
    mobile: ua.os === 'android' ? ua.device?.type !== 'tablet' : ua.os === 'iOS' ? !isTablet : false,
    model: ua.os === 'android' || ua.os === 'iOS' ? ua.device?.model || '' : '',
    platformVersion: platformVersionFor(ua),
    screen,
    webgl,
    gpu,
    gpuCapability: buildGpuCapability(ua, gpu.vendor),
    webglShaderPrecision: buildWebGlShaderPrecision(ua),
    mediaDevices: buildMediaDevices(ua, seed),
    fonts: buildFonts(ua, seed),
    permissions: {
      camera: 'prompt',
      microphone: 'prompt',
      speakerSelection: 'prompt',
      localFonts: 'prompt',
    },
    // Canvas: deterministic integer seed 1–65535 derived from profile seed
    canvasNoise: (seed % 65535) + 1,
    audioNoise: ((seed % 100) + 1) * 0.000005,
    audioSeed: hashString(`${seed}|audio|${ua.userAgent}`) >>> 0,
    timezoneZone: buildTimezoneZone(language, seed),

    domRectNoise: hashString(`${seed}|domrect`) >>> 0,
    textMetricsNoise: hashString(`${seed}|textmetrics`) >>> 0,
    mathFingerprint: {
      noise: hashString(`${seed}|math`) >>> 0,
    },
    speechVoices: buildSpeechVoices(ua, seed),
    webrtcCandidatePolicy: 'obfuscate' as const,
    batteryLevel: buildBatteryLevel(seed),
    batteryCharging: (seed & 2) === 0,
  }
}

const buildSpeechVoices = (ua: ReadonlyUserAgentState, seed: number): Array<{ name: string; lang: string; localService: boolean; voiceURI: string; default: boolean }> => {
  const rng = mulberry32(seed ^ 0xd3adb33f)
  const voices: Array<{ name: string; lang: string; localService: boolean; voiceURI: string; default: boolean }> = []

  const chromiumVoicesWin = [
    { name: 'Microsoft David', lang: 'en-US', localService: true,  voiceURI: 'Microsoft David - English (United States)' },
    { name: 'Microsoft Zira',  lang: 'en-US', localService: true,  voiceURI: 'Microsoft Zira - English (United States)' },
    { name: 'Microsoft Mark',  lang: 'en-US', localService: true,  voiceURI: 'Microsoft Mark - English (United States)' },
    { name: 'Google US English',         lang: 'en-US', localService: false, voiceURI: 'Google US English' },
    { name: 'Google UK English Female',  lang: 'en-GB', localService: false, voiceURI: 'Google UK English Female' },
    { name: 'Google UK English Male',    lang: 'en-GB', localService: false, voiceURI: 'Google UK English Male' },
    { name: 'Google Deutsch',  lang: 'de-DE', localService: false, voiceURI: 'Google Deutsch' },
    { name: 'Google français', lang: 'fr-FR', localService: false, voiceURI: 'Google français' },
    { name: 'Google español',  lang: 'es-ES', localService: false, voiceURI: 'Google español' },
    { name: 'Google italiano', lang: 'it-IT', localService: false, voiceURI: 'Google italiano' },
    { name: 'Google polski',   lang: 'pl-PL', localService: false, voiceURI: 'Google polski' },
    { name: 'Google Nederlands', lang: 'nl-NL', localService: false, voiceURI: 'Google Nederlands' },
  ]
  const chromiumVoicesMac = [
    { name: 'Samantha', lang: 'en-US', localService: true, voiceURI: 'com.apple.speech.synthesis.voice.samantha.premium' },
    { name: 'Alex',     lang: 'en-US', localService: true, voiceURI: 'com.apple.speech.synthesis.voice.Alex' },
    { name: 'Victoria', lang: 'en-US', localService: true, voiceURI: 'com.apple.speech.synthesis.voice.Victoria' },
    { name: 'Daniel',   lang: 'en-GB', localService: true, voiceURI: 'com.apple.speech.synthesis.voice.daniel.premium' },
    { name: 'Karen',    lang: 'en-AU', localService: true, voiceURI: 'com.apple.speech.synthesis.voice.karen.premium' },
    { name: 'Thomas',   lang: 'fr-FR', localService: true, voiceURI: 'com.apple.speech.synthesis.voice.thomas' },
    { name: 'Anna',     lang: 'de-DE', localService: true, voiceURI: 'com.apple.speech.synthesis.voice.anna' },
    { name: 'Alice',    lang: 'it-IT', localService: true, voiceURI: 'com.apple.speech.synthesis.voice.alice' },
    { name: 'Monica',   lang: 'es-ES', localService: true, voiceURI: 'com.apple.speech.synthesis.voice.monica' },
    { name: 'Zosia',    lang: 'pl-PL', localService: true, voiceURI: 'com.apple.speech.synthesis.voice.zosia' },
    { name: 'Google US English', lang: 'en-US', localService: false, voiceURI: 'Google US English' },
  ]
  const chromiumVoicesLinux = [
    { name: 'English (America)',      lang: 'en-US', localService: true, voiceURI: 'English (America)' },
    { name: 'English (Great Britain)',lang: 'en-GB', localService: true, voiceURI: 'English (Great Britain)' },
    { name: 'German',   lang: 'de-DE', localService: true, voiceURI: 'German' },
    { name: 'French',   lang: 'fr-FR', localService: true, voiceURI: 'French' },
    { name: 'Spanish',  lang: 'es-ES', localService: true, voiceURI: 'Spanish' },
    { name: 'Polish',   lang: 'pl-PL', localService: true, voiceURI: 'Polish' },
  ]
  const chromiumVoicesAndroid = [
    { name: 'English United States', lang: 'en-US', localService: true, voiceURI: 'English United States' },
    { name: 'English United Kingdom', lang: 'en-GB', localService: true, voiceURI: 'English United Kingdom' },
    { name: 'German Germany', lang: 'de-DE', localService: true, voiceURI: 'German Germany' },
    { name: 'French France', lang: 'fr-FR', localService: true, voiceURI: 'French France' },
    { name: 'Italian Italy', lang: 'it-IT', localService: true, voiceURI: 'Italian Italy' },
    { name: 'Spanish Spain', lang: 'es-ES', localService: true, voiceURI: 'Spanish Spain' },
    { name: 'Polish Poland', lang: 'pl-PL', localService: true, voiceURI: 'Polish Poland' },
    { name: 'Dutch Netherlands', lang: 'nl-NL', localService: true, voiceURI: 'Dutch Netherlands' },
  ]

  const pool = (() => {
    switch (ua.os) {
      case 'windows': return chromiumVoicesWin
      case 'macOS': return chromiumVoicesMac
      case 'linux': return chromiumVoicesLinux
      case 'android': return chromiumVoicesAndroid
      case 'iOS': return chromiumVoicesMac
      default: return chromiumVoicesWin
    }
  })()

  const count = Math.min(pool.length, 4 + Math.floor(rng() * (pool.length - 3)))
  const shuffled = fisherYates([...pool], rng)
  // First local-service voice in the list gets default: true (matches browser behaviour)
  let defaultAssigned = false
  for (let i = 0; i < count; i++) {
    const v = shuffled[i]
    const isDefault = !defaultAssigned && v.localService
    if (isDefault) defaultAssigned = true
    voices.push({ ...v, default: isDefault })
  }
  // Fallback: if no local voice, mark first voice as default
  if (!defaultAssigned && voices.length > 0) {
    voices[0] = { ...voices[0], default: true }
  }
  return voices
}

const buildBatteryLevel = (seed: number): number => {
  const levels = [0.55, 0.62, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0, 1.0, 1.0]
  return levels[seed % levels.length]
}
