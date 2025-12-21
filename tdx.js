import 'dotenv/config'
import axios from 'axios'
import url from 'node:url'

let ACCESS_TOKEN = ''
let TOKEN_UPDATE = 0

export const getAccessToken = async () => {
  const now = new Date().getTime()
  if (ACCESS_TOKEN && now - TOKEN_UPDATE < 72000000) {
    return ACCESS_TOKEN
  }

  const params = new url.URLSearchParams({
    grant_type: 'client_credentials',
    client_id: process.env.TDX_CLIENT_ID,
    client_secret: process.env.TDX_CLIENT_SECRET,
  })

  try {
    const { data } = await axios.post(
      'https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token',
      params.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    )
    ACCESS_TOKEN = data.access_token
    TOKEN_UPDATE = new Date().getTime()
    return ACCESS_TOKEN
  } catch (error) {
    console.error('取得 TDX Token 失敗:', error.response?.data || error.message)
    throw error
  }
}
