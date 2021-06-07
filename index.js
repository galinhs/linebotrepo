import linebot from 'linebot'
import dotenv from 'dotenv'
import axios from 'axios'
// import cheerio from 'cheerio'
import schedule from 'node-schedule'

// https://scidm.nchc.org.tw/dataset/drink-water

let data = []

const getData = () => {
  axios
    .get(
      'https://overpass.nchc.org.tw/api/interpreter?data=%2F*%0AThis%20has%20been%20generated%20by%20the%20overpass-turbo%20wizard.%0AThe%20original%20search%20was%3A%0A%E2%80%9Ctype%3Anode%20and%20amenity%3Ddrinking_water%20in%20TW%E2%80%9D%0A*%2F%0A%5Bout%3Ajson%5D%5Btimeout%3A25%5D%3B%0A%2F%2F%20fetch%20area%20%E2%80%9CTW%E2%80%9D%20to%20search%20in%0Aarea%283600449220%29-%3E.searchArea%3B%0A%2F%2F%20gather%20results%0A%28%0A%20%20%2F%2F%20query%20part%20for%3A%20%E2%80%9Camenity%3Ddrinking_water%E2%80%9D%0A%20%20node%5B%22amenity%22%3D%22drinking_water%22%5D%28area.searchArea%29%3B%0A%29%3B%0A%2F%2F%20print%20results%0Aout%20body%3B%0A%3E%3B%0Aout%20skel%20qt%3B'
    )
    .then(response => {
      data = response.data.elements
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
        const lat2 = d.lat
        const lon2 = d.lon

        const dis = distance(lat1, lon1, lat2, lon2, 'K')

        // console.log(dis)

        if (dis <= 1.5) {
          reply.push({
            type: 'location',
            title: d.tags.description || '未知地點',
            address: d.tags.description || '未知地點',
            latitude: d.lat,
            longitude: d.lon,
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
