import linebot from 'linebot'
import dotenv from 'dotenv'
import axios from 'axios'
// import cheerio from 'cheerio'
import schedule from 'node-schedule'

// https://scidm.nchc.org.tw/dataset/drink-water

let data = []

const getData = () => {
  axios
    .get('https://data.taipei/api/v1/dataset/59629791-5f4f-4c91-903b-e9ab9aa0653b?scope=resourceAquire')
    .then(response => {
      data = response.data.results
    })
    .catch()
}

// 每天 0 點更新資料
schedule.scheduleJob('* * 0 * *', getData)
// 機器人啟動時也要有資料
getData()

// 讓套件讀取 .env 檔案
// 讀取後可以用 process.env.變數 使用
dotenv.config()

const bot = linebot({
  channelId: process.env.CHANNEL_ID,
  channelSecret: process.env.CHANNEL_SECRET,
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN
})

bot.listen('/', process.env.PORT, () => {
  console.log('機器人啟動')
})

// 距離計算公式
const distance = (lat1, lon1, lat2, lon2, unit = 'K') => {
  if (lat1 === lat2 && lon1 === lon2) {
    return 0
  } else {
    const radlat1 = (Math.PI * lat1) / 180
    const radlat2 = (Math.PI * lat2) / 180
    const theta = lon1 - lon2
    const radtheta = (Math.PI * theta) / 180
    let dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta)
    if (dist > 1) {
      dist = 1
    }
    dist = Math.acos(dist)
    dist = (dist * 180) / Math.PI
    dist = dist * 60 * 1.1515
    if (unit === 'K') {
      dist = dist * 1.609344
    }
    if (unit === 'N') {
      dist = dist * 0.8684
    }
    return dist
  }
}

bot.on('message', async event => {
  try {
    if (event.message.type === 'location') {
      const lat1 = event.message.latitude
      const lon1 = event.message.longitude

      let reply = []
      for (const d of data) {
        const lat2 = d.緯度
        const lon2 = d.經度

        const dis = distance(lat1, lon1, lat2, lon2, 'K')

        // console.log(dis)

        if (dis <= 1.5) {
          reply.push({
            type: 'location',
            title: d.場所名稱,
            address: d.地址,
            latitude: d.緯度,
            longitude: d.經度,
            dis
          })
        }

        console.log(dis)
      }

      reply = reply
        .sort((a, b) => {
          return a.dis - b.dis
        })
        .map(a => {
          delete a.dis
          return a
        })
        .slice(0, 4)

      event.reply(reply)
      console.log(reply)
    }
  } catch (error) {
    console.log(error)
    event.reply('發生錯誤')
  }
})
