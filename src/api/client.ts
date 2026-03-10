import type { AxiosRequestConfig, AxiosResponse } from 'axios'
import http from './http'

export const apiGet = async <TData>(url: string, config?: AxiosRequestConfig): Promise<TData> => {
  const response = await http.get<TData>(url, config)
  return response.data
}

export const apiPost = async <TData, TPayload = unknown>(
  url: string,
  payload?: TPayload,
  config?: AxiosRequestConfig
): Promise<TData> => {
  const response = await http.post<TData>(url, payload, config)
  return response.data
}

const extractFileName = (contentDisposition?: string) => {
  if (!contentDisposition) return undefined
  const match = /filename="?([^"]+)"?/i.exec(contentDisposition)
  return match?.[1]
}

export const downloadFile = async (
  url: string,
  fileName?: string,
  config?: AxiosRequestConfig
): Promise<{ blob: Blob; fileName: string }> => {
  const response: AxiosResponse<Blob> = await http.get(url, {
    ...config,
    responseType: 'blob',
  })

  const resolvedName =
    fileName || extractFileName(response.headers?.['content-disposition']) || 'download'
  const blobUrl = window.URL.createObjectURL(response.data)

  const link = document.createElement('a')
  link.href = blobUrl
  link.download = resolvedName
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(blobUrl)

  return { blob: response.data, fileName: resolvedName }
}

