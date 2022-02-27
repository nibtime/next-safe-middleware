import type { NextApiHandler } from 'next';

const handler: NextApiHandler = (req, res) => {
    console.log('Reporting API data', { body: req.body, method: req.method })
    res.status(200).json({ message: 'logged reporting data'})
}
export default handler;