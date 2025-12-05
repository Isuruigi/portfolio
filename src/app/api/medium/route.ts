import { NextResponse } from 'next/server'
import Parser from 'rss-parser'

const parser = new Parser({
    customFields: {
        item: [
            ['content:encoded', 'content'],
            ['dc:creator', 'creator'],
        ],
    },
})

export async function GET() {
    try {
        const feed = await parser.parseURL('https://medium.com/feed/@isuruig')

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const posts = feed.items.slice(0, 6).map((item: any) => {
            const content = item.content as string | undefined
            const contentSnippet = item.contentSnippet as string | undefined
            const description = item.description as string | undefined

            // Extract thumbnail from content
            const thumbnailMatch = content?.match(/<img[^>]+src="([^">]+)"/)
            const thumbnail = thumbnailMatch ? thumbnailMatch[1] : null

            // Calculate reading time (rough estimate)
            const wordCount = content ? content.split(/\s+/).length : 0
            const readingTime = Math.ceil(wordCount / 200) // 200 words per minute

            // Clean description
            const rawDescription = contentSnippet || description || ''
            const cleanDescription = rawDescription
                .replace(/<[^>]*>/g, '') // Remove HTML tags
                .substring(0, 150) + '...' // Limit to 150 chars

            return {
                title: item.title as string,
                link: item.link as string,
                pubDate: item.pubDate as string,
                description: cleanDescription,
                categories: (item.categories || []) as string[],
                thumbnail,
                readingTime: `${readingTime} min read`,
                creator: (item.creator as string) || 'Isuru (IG) Chathuranga',
            }
        })

        return NextResponse.json({
            success: true,
            posts,
            profileUrl: 'https://medium.com/@isuruig'
        })
    } catch (error) {
        console.error('Error fetching Medium feed:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch posts' },
            { status: 500 }
        )
    }
}
