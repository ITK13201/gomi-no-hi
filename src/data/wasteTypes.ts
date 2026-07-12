export type WasteTypeId =
  | 'burnable'
  | 'nonBurnable'
  | 'paper'
  | 'petBottle'
  | 'bottle'
  | 'can'
  | 'oldClothes'
  | 'whiteTray'
  | 'hazardous'

export type WasteMaster = {
  id: WasteTypeId
  label: string
  shortLabel: string
  color: string
  bgColor: string
  borderColor: string
  textColor: string
  container: string
  notes: string[]
}

export const WASTE_TYPES: Record<WasteTypeId, WasteMaster> = {
  burnable: {
    id: 'burnable',
    label: '燃えるごみ',
    shortLabel: '燃えるごみ',
    color: '#f472b6',
    bgColor: 'bg-pink-100',
    borderColor: 'border-pink-300',
    textColor: 'text-pink-800',
    container: '透明または半透明の袋',
    notes: ['一辺が50cm未満のもの', '台所の生ごみは水分をよく切る'],
  },
  nonBurnable: {
    id: 'nonBurnable',
    label: '燃えないごみ',
    shortLabel: '燃えないごみ',
    color: '#4ade80',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-300',
    textColor: 'text-green-800',
    container: '黄色のカゴ',
    notes: ['一辺が50cm未満のもの', '割れものは新聞紙などに包み品物名を明記'],
  },
  paper: {
    id: 'paper',
    label: '古紙類',
    shortLabel: '古紙類',
    color: '#86efac',   // 燃えないごみと同日のため薄めで区別
    bgColor: 'bg-green-100',
    borderColor: 'border-green-300',
    textColor: 'text-green-800',
    container: '品目ごとにひもでしばる',
    notes: ['新聞紙・雑誌・段ボール・牛乳パックなど', '段ボールは必ずつぶす'],
  },
  petBottle: {
    id: 'petBottle',
    label: 'ペットボトル',
    shortLabel: 'ペット',
    color: '#a855f7',
    bgColor: 'bg-purple-100',
    borderColor: 'border-purple-300',
    textColor: 'text-purple-800',
    container: '黄色のカゴ（袋に入れない）',
    notes: [
      'キャップとラベルを外す',
      'すすいでつぶす',
      '無色透明なもの限定（醤油・みりん・料理酒含む）',
    ],
  },
  bottle: {
    id: 'bottle',
    label: 'びん',
    shortLabel: 'びん',
    color: '#22d3ee',
    bgColor: 'bg-cyan-100',
    borderColor: 'border-cyan-300',
    textColor: 'text-cyan-800',
    container: '青色のカゴ（袋に入れない）',
    notes: ['中身を空にしてすすぐ', 'キャップは外す', '割れたびんもびんとして出す'],
  },
  can: {
    id: 'can',
    label: '缶',
    shortLabel: '缶',
    color: '#eab308',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-300',
    textColor: 'text-yellow-800',
    container: '黄色のカゴ（袋に入れない）',
    notes: ['中身を空にしてすすぐ', 'スプレー缶・カセットボンベは危険ごみへ'],
  },
  oldClothes: {
    id: 'oldClothes',
    label: '古着類',
    shortLabel: '古着',
    color: '#67e8f9',   // びんと同日のため薄めで区別
    bgColor: 'bg-cyan-100',
    borderColor: 'border-cyan-300',
    textColor: 'text-cyan-800',
    container: '透明または半透明の袋',
    notes: ['洗って乾かしてから出す', '雨の日は避ける', '濡れたものは資源になりません'],
  },
  whiteTray: {
    id: 'whiteTray',
    label: '白色トレイ',
    shortLabel: 'トレイ',
    color: '#67e8f9',
    bgColor: 'bg-cyan-100',
    borderColor: 'border-cyan-300',
    textColor: 'text-cyan-800',
    container: '黄色のカゴ（袋に入れない）',
    notes: ['洗って乾かす', '食品用の白いもの限定', '色・柄つきは燃えるごみ'],
  },
  hazardous: {
    id: 'hazardous',
    label: '危険ごみ',
    shortLabel: '危険',
    color: '#f87171',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-300',
    textColor: 'text-red-800',
    container: '赤色のカゴ',
    notes: [
      'スプレー缶・カセットボンベは使い切ってから',
      '乾電池・蛍光管・水銀入り体温計',
      'モバイルバッテリー・リチウムイオン電池',
      'ライター（使い切ってから）',
    ],
  },
}

export const WASTE_TYPE_LIST = Object.values(WASTE_TYPES)
