const uniqueTabAllList = document.querySelectorAll('.unique__tab-item')
uniqueTabAllList.forEach((item) => {
   var uniqueTabID = item.id;
  
  if (item.textContent === null || !item.textContent.trim()) {
    let uniqueTabList = item.parentElement.previousElementSibling.children;
    
    Object.values(uniqueTabList).forEach((sinitem) => {
      if('unique' in sinitem.dataset){
        if(sinitem.dataset.unique === uniqueTabID){
          sinitem.remove();
        };		
      }
    });
    item.remove();
  }
});