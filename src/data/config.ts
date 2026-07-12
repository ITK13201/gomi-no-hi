export type RegionConfig = {
  name: string
  district: string
  city: string
  contact: {
    general: string
    bulky: string
  }
  calendarPeriod: {
    start: string
    end: string
  }
}

export const REGION_CONFIG: RegionConfig = {
  name: '越谷市 第9地区',
  district: '第9地区',
  city: '越谷市',
  contact: {
    general: '048-976-5375',
    bulky: '048-973-5300',
  },
  calendarPeriod: {
    start: '2026-04-01',
    end: '2027-03-31',
  },
}
