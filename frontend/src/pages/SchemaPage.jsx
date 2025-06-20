// frontend/src/pages/SchemaPage.jsx

import React, { useEffect, useState } from 'react'
import { fetchEsquema } from '../api'

export default function SchemaPage() {
  const [url, setUrl] = useState(null)

  useEffect(() => {
    fetchEsquema()
      .then(blob => {
        const objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      })
      .catch(console.error)
  }, [])

  if (!url) return <div>Loading schema…</div>
  return <img src={url} alt="Database schema diagram" className="rounded shadow" />
}
