import { useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { API } from '../api'

export function usePartidoStream(partidoId, enabled = true, onData) {
  const qc = useQueryClient()
  const esRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const reconnectAttempts = useRef(0)
  const onDataRef = useRef(onData)
  onDataRef.current = onData

  const connect = useCallback(() => {
    if (!partidoId || !enabled) return
    if (esRef.current) return

    const url = `${API}/partidos/${partidoId}/stream`
    const es = new EventSource(url)
    esRef.current = es

    es.onopen = () => {
      reconnectAttempts.current = 0
    }

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.error) {
          console.warn('[SSE] Server error:', data.error)
          return
        }
        // Invalidar queries relacionadas para que TanStack Query refresque
        if (data.seg !== undefined || data.running !== undefined || data.iniciado !== undefined) {
          qc.setQueryData(['partido', partidoId], (old) => {
            if (!old) return old
            return { ...old, seg: data.seg, running: data.running, iniciado: data.iniciado }
          })
        }
        if (data.eventos) {
          qc.setQueryData(['eventos', partidoId], data.eventos)
        }
        if (data.marcador) {
          qc.setQueryData(['partido', partidoId], (old) => {
            if (!old) return old
            return { ...old, goles_local: data.marcador.local, goles_visitante: data.marcador.visitante }
          })
        }
        if (onDataRef.current) onDataRef.current(data)
      } catch (e) {
        console.warn('[SSE] Parse error:', e)
      }
    }

    es.onerror = (err) => {
      console.warn('[SSE] Connection error, reconnecting...', err)
      es.close()
      esRef.current = null
      const delay = Math.min(1000 * 2 ** reconnectAttempts.current, 30000)
      reconnectAttempts.current++
      reconnectTimeoutRef.current = setTimeout(connect, delay)
    }
  }, [partidoId, enabled, qc])

  useEffect(() => {
    connect()
    return () => {
      if (esRef.current) {
        esRef.current.close()
        esRef.current = null
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [connect])

  return { connected: !!esRef.current && esRef.current.readyState === EventSource.OPEN }
}