import { Router, Request, Response } from 'express';

const router = Router();
const urlRegex = /^(https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*))$/;


router.post('/check-compliance', async (req: Request, res: Response) => {
    const { url } = req.body;

    if (!url || !urlRegex.test(url)) {
        return res.status(400).send({ error: 'Invalid URL format' });
    }

    // 3. Fetch the HTML content
    try {
        const response = await fetch(url);
        if (!response.ok) {
            return res.status(500).json({ error: 'Failed to fetch the webpage' });
        }

        // 4. Return the HTML content in the response
        const htmlContent = await response.text();
        return res.status(200).json({ content: htmlContent });
    } catch (error) {
        console.error('Error fetching URL:', error);
        return res.status(500).json({ error: 'Something went wrong while fetching the URL' });
    }
});

export default router;
