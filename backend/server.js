import express from 'express'
import cors from 'cors'
import multer from 'multer'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@deepgram/sdk'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DB_PATH = path.join(__dirname, 'db.json')

const app = express()
const upload = multer({ dest: 'uploads/' })
const deepgram = createClient(process.env.DEEPGRAM_API_KEY)

app.use(cors({ origin: '*' }))
app.use(express.json())

const readDB = () => JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'))
const writeDB = (data) => fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2))

app.get('/', (req, res) => {
  res.json({ message: 'Audio Transcriber API is running!' })
})

app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' })
    }

    console.log('Transcribing:', req.file.originalname)
    const audioBuffer = fs.readFileSync(req.file.path)

    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      audioBuffer,
      { model: 'nova-2', smart_format: true, punctuate: true }
    )

    if (error) throw new Error(error.message)

    const transcript = result.results.channels[0].alternatives[0].transcript
    fs.unlinkSync(req.file.path)

    const newEntry = {
      id: Date.now().toString(),
      filename: req.file.originalname,
      transcript: transcript || 'No speech detected',
      createdAt: new Date().toISOString()
    }

    const db = readDB()
    db.transcriptions.unshift(newEntry)
    writeDB(db)

    res.json(newEntry)
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/transcriptions', (req, res) => {
  try {
    const db = readDB()
    res.json(db.transcriptions)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.delete('/api/transcriptions/:id', (req, res) => {
  try {
    const db = readDB()
    db.transcriptions = db.transcriptions.filter(t => t.id !== req.params.id)
    writeDB(db)
    res.json({ message: 'Deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.listen(process.env.PORT || 5000, () => {
  console.log(`Server running on http://localhost:${process.env.PORT || 5000}`)
})