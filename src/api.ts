import { Router, Request, Response } from 'express';
import { closeBrowser, getRenderedText } from './utils';

const router = Router();
const urlRegex = /^(https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*))$/;


router.post('/check-compliance', async (req: Request, res: Response) => {
    const { url } = req.body;

    if (!url || !urlRegex.test(url)) {
        return res.status(400).send({ error: 'Invalid URL format' });
    }

    try {
        const renderedText = await getRenderedText(url);
        if (renderedText.length > 100) {
            console.log(renderedText);
        }
        res.status(200).json({
            text: renderedText
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error rendering the page' });
    } finally {
        await closeBrowser();
    }

});

export default router;
