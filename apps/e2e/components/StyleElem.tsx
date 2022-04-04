const StyleElem = ({ Tag, children, color = "teal" }) => {
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
    .styleElem {
      color: ${color}
    }
  `,
        }}
      />
      <Tag className="styleElem">{children}</Tag>
    </>
  );
};

export default StyleElem;
