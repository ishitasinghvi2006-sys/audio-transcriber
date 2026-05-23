import { useState, useRef, useEffect } from 'react'

const API = 'http://localhost:5000'

export default function App() {
  const [transcript, setTranscript] = useState('')
  const [loading, setLoading] = useState(false)
  const [recording, setRecording] = useState(false)
  const [history, setHistory] = useState([])
  const [error, setError] = useState('')
  const mediaRecorder = useRef(null)
  const chunks = useRef([])

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API}/api/transcriptions`)
      const data = await res.json()
      setHistory(data)
    } catch (err) {
      console.error('Failed to fetch history')
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    await transcribeAudio(file)
  }

  const transcribeAudio = async (file) => {
    setLoading(true)
    setError('')
    setTranscript('')
    try {
      const form = new FormData()
      form.append('audio', file)
      const res = await fetch(`${API}/api/transcribe`, {
        method: 'POST',
        body: form
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTranscript(data.transcript)
      fetchHistory()
    } catch (err) {
      setError('Transcription failed. Check your API key and try again.')
    } finally {
      setLoading(false)
    }
  }

  const startRecording = async () => {
    setError('')
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorder.current = new MediaRecorder(stream)
    chunks.current = []
    mediaRecorder.current.ondataavailable = (e) => chunks.current.push(e.data)
    mediaRecorder.current.onstop = async () => {
      const blob = new Blob(chunks.current, { type: 'audio/webm' })
      const file = new File([blob], 'recording.webm', { type: 'audio/webm' })
      await transcribeAudio(file)
      stream.getTracks().forEach(t => t.stop())
    }
    mediaRecorder.current.start()
    setRecording(true)
  }

  const stopRecording = () => {
    mediaRecorder.current.stop()
    setRecording(false)
  }

  const deleteTranscription = async (id) => {
    await fetch(`${API}/api/transcriptions/${id}`, { method: 'DELETE' })
    fetchHistory()
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-3xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-purple-400 mb-2">
            🎙️ Audio Transcriber
          </h1>
          <p className="text-gray-400">
            Upload or record audio and convert it to text instantly
          </p>
        </div>

        {/* Upload & Record */}
        <div className="bg-gray-900 rounded-2xl p-6 mb-6 border border-gray-800">
          <div className="flex flex-col sm:flex-row gap-4">

            <label className="flex-1 cursor-pointer">
              <div className="bg-purple-600 hover:bg-purple-700 transition rounded-xl p-4 text-center font-semibold">
                📁 Upload Audio File
              </div>
              <input
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>

            <button
              onClick={recording ? stopRecording : startRecording}
              className={`flex-1 rounded-xl p-4 font-semibold transition ${
                recording
                  ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {recording ? '⏹ Stop Recording' : '🎤 Start Recording'}
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="bg-gray-900 border border-purple-800 rounded-2xl p-6 mb-6 text-center">
            <div className="text-purple-400 text-lg animate-pulse">
              ⏳ Transcribing your audio...
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-900 border border-red-700 rounded-2xl p-4 mb-6 text-red-300">
            ❌ {error}
          </div>
        )}

        {/* Result */}
        {transcript && (
          <div className="bg-gray-900 border border-green-700 rounded-2xl p-6 mb-6">
            <h2 className="text-green-400 font-bold mb-3">✅ Transcript</h2>
            <p className="text-gray-200 leading-relaxed">{transcript}</p>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-300 mb-4">📜 History</h2>
            <div className="flex flex-col gap-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-4"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-purple-400 text-sm font-medium">
                      🎵 {item.filename}
                    </span>
                    <button
                      onClick={() => deleteTranscription(item.id)}
                      className="text-red-500 hover:text-red-400 text-sm"
                    >
                      🗑 Delete
                    </button>
                  </div>
                  <p className="text-gray-300 text-sm">{item.transcript}</p>
                  <p className="text-gray-600 text-xs mt-2">
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}