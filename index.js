import 'dotenv/config'
import linebot from 'linebot'
import axios from 'axios'
import { getAccessToken } from './tdx.js'

const bot = linebot({
  channelId: process.env.CHANNEL_ID,
  channelSecret: process.env.CHANNEL_SECRET,
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
})

bot.on('message', async (event) => {
  if (event.message.type === 'location') {
    const { latitude, longitude } = event.message

    try {
      const token = await getAccessToken()
      const headers = { Authorization: `Bearer ${token}` }
      const spatialFilter = `$spatialFilter=nearby(${latitude}, ${longitude}, 500)`

      const [availRes, stationRes] = await Promise.all([
        axios.get(
          `https://tdx.transportdata.tw/api/advanced/v2/Bike/Availability/NearBy?${spatialFilter}&$format=JSON`,
          { headers },
        ),
        axios.get(
          `https://tdx.transportdata.tw/api/advanced/v2/Bike/Station/NearBy?${spatialFilter}&$format=JSON`,
          { headers },
        ),
      ])

      const availData = availRes.data
      const stationData = stationRes.data

      if (availData.length === 0) {
        return event.reply('目前位置周邊無站點資訊')
      }

      const stationInfoMap = new Map()
      stationData.forEach((s) => {
        stationInfoMap.set(s.StationUID, {
          name: s.StationName.Zh_tw.replace('YouBike2.0_', ''),
          lat: s.StationPosition.PositionLat,
          lon: s.StationPosition.PositionLon,
        })
      })

      const bubbles = availData.slice(0, 3).map((item) => {
        const info = stationInfoMap.get(item.StationUID) || { name: '未知站點', lat: 0, lon: 0 }

        const bikeCount = item.AvailableRentBikes ?? 0
        const slotCount = item.AvailableReturnBikes ?? item.AvailableReturnSlots ?? 0
        const ebikes = item.AvailableRentBikesDetail?.ElectricBikes ?? 0
        const normalBikes = bikeCount - ebikes

        const statusText = item.ServiceStatus === 1 ? '正常營運' : '暫停服務'
        const statusColor = item.ServiceStatus === 1 ? '#06C755' : '#EF4444'

        return {
          type: 'bubble',
          size: 'micro',
          styles: {
            header: { backgroundColor: '#FFB133' },
            footer: { separator: false },
          },
          header: {
            type: 'box',
            layout: 'vertical',
            paddingAll: '12px',
            contents: [
              {
                type: 'text',
                text: info.name,
                weight: 'bold',
                size: 'sm',
                color: '#FFFFFF',
                wrap: true,
                maxLines: 2,
              },
            ],
          },
          body: {
            type: 'box',
            layout: 'vertical',
            paddingAll: '12px',
            spacing: 'md',
            contents: [
              {
                type: 'box',
                layout: 'vertical',
                spacing: 'sm',
                contents: [
                  {
                    type: 'box',
                    layout: 'horizontal',
                    contents: [
                      { type: 'text', text: '一般車', size: 'xs', color: '#666666' },
                      {
                        type: 'text',
                        text: String(normalBikes),
                        size: 'xs',
                        color: '#111111',
                        align: 'end',
                        weight: 'bold',
                      },
                    ],
                  },
                  {
                    type: 'box',
                    layout: 'horizontal',
                    contents: [
                      { type: 'text', text: '電輔車', size: 'xs', color: '#FF4B00' },
                      {
                        type: 'text',
                        text: String(ebikes),
                        size: 'xs',
                        color: '#FF4B00',
                        align: 'end',
                        weight: 'bold',
                      },
                    ],
                  },
                  {
                    type: 'box',
                    layout: 'horizontal',
                    contents: [
                      { type: 'text', text: '可還位', size: 'xs', color: '#666666' },
                      {
                        type: 'text',
                        text: String(slotCount),
                        size: 'xs',
                        color: '#111111',
                        align: 'end',
                        weight: 'bold',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'text',
                text: statusText,
                size: 'xxs',
                color: statusColor,
                weight: 'bold',
              },
            ],
          },
          footer: {
            type: 'box',
            layout: 'vertical',
            paddingAll: '12px',
            paddingTop: '0px',
            contents: [
              {
                type: 'button',
                action: {
                  type: 'uri',
                  label: '地圖導航',
                  uri: `https://www.google.com/maps/dir/?api=1&destination=${info.lat},${info.lon}`,
                },
                style: 'primary',
                color: '#FFB133',
                height: 'sm',
              },
            ],
          },
        }
      })

      event.reply({
        type: 'flex',
        altText: '查詢周邊單車資訊',
        contents: { type: 'carousel', contents: bubbles },
      })
    } catch (error) {
      console.error('Error:', error)
      event.reply('查詢發生錯誤，請稍後再試')
    }
  }
})

bot.listen('/', process.env.PORT || 3000, () => {
  console.log('機器人啟動完成')
})
