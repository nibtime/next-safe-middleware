export default async function handler(req, res) {
  // Check for secret to confirm this is a valid request
  if (req.query.secret !== 'this should be a real secret') {
    return res.status(401).json({ message: 'Invalid token' });
  }

  const pathToRevalidate = req.query.pathname;
  if (!pathToRevalidate || typeof pathToRevalidate !== 'string') {
    return res.status(404).json({
      message: 'Tell path to revalidate as string(req.query.pathname)',
    });
  }
  try {
    await res.unstable_revalidate(pathToRevalidate);
    return res.json({ revalidated: true });
  } catch (err) {
    // If there was an error, Next.js will continue
    // to show the last successfully generated page
    return res.status(500).send('Error revalidating');
  }
}
