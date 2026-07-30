theme.productTab = (function() {
  const tab = function () {
    const tabList = document.querySelectorAll('[data-toggle="tab"]')
    tabList.forEach(function (list) {
      list.addEventListener('click', function () {
        const targetId = this.getAttribute('data-target'),
              target = document.querySelector(targetId)
        this.parentElement.querySelectorAll('[data-toggle="tab"]').forEach(function(list) {
          list.classList.remove('active')
        })
        this.classList.add('active')
        target.classList.add('active')
        setTimeout(function(){
          target.classList.add('show')
        }, 150)
        getSiblings(target).forEach(function(pane) {
          pane.classList.remove('show')
          setTimeout(function(){
            pane.classList.remove('active')
          }, 150)
        })
      })
    })
  }
  return tab;
})();