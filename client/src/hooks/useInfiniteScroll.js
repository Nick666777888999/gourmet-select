import { useState, useEffect, useCallback } from 'react'

export const useInfiniteScroll = (fetchMore, hasMore) => {
  const [isFetching, setIsFetching] = useState(false)

  const handleScroll = useCallback(() => {
    if (window.innerHeight + document.documentElement.scrollTop !== document.documentElement.offsetHeight || isFetching || !hasMore) {
      return
    }
    setIsFetching(true)
  }, [isFetching, hasMore])

  useEffect(() => {
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  useEffect(() => {
    if (!isFetching) return
    
    const fetchData = async () => {
      try {
        await fetchMore()
      } catch (error) {
        console.error('Error fetching more data:', error)
      } finally {
        setIsFetching(false)
      }
    }

    fetchData()
  }, [isFetching, fetchMore])

  return [isFetching, setIsFetching]
}
