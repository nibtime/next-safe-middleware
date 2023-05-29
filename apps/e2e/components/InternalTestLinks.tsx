export const InternalTestLinks = () => {
  return (
    <ul>
      <li>
        <a href="/gsp">Page with getStaticProps</a> (Hash-based)
      </li>
      <li>
        <a href="/gssp">Page with getServerSideProps</a> (Nonce-based)
      </li>
      <li>
        <a href="/gssp-redirect">Page with getServerSideProps</a> (Nonce-based (redirect props))
      </li>
      <li>
        <a href="/gssp-not-found">Page with getServerSideProps</a> (Nonce-based (notFound props) - page should show 404 error)
      </li>
      <li>
        <a href="/isr/gsp">
          Page with getStaticProps + <code>revalidate</code> (ISR)
        </a>{' '}
        (Hash-based)
      </li>
    </ul>
  );
};

export default InternalTestLinks;
