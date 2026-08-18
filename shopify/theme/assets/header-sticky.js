theme.headerSticky = (function () {
  function ScrollSticky() {
    const headerStickyWrapper = document.querySelector("header");
    const headerStickyTargetList = document.querySelectorAll(".header__sticky");

    if (headerStickyTargetList.length > 0) {
      let headerHeight = headerStickyWrapper.clientHeight;
      headerStickyTargetList.forEach((headerStickyTarget) => {
        window.addEventListener("scroll", function () {
          let StickyTargetElement = TopOffset(headerStickyWrapper);
          let TargetElementTopOffset = StickyTargetElement.top;

          if (window.scrollY > TargetElementTopOffset) {
            headerStickyTarget.classList.add("sticky");
          } else {
            headerStickyTarget.classList.remove("sticky");
          }
        });
      });
    }
  }
  return ScrollSticky;
})();
