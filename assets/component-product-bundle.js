




  // Move this outside DOMContentLoaded so it's attached immediately
  document.addEventListener("AppstleSubscription:SubscriptionWidget:widgetInitialised", function () {
    console.log("Appstle widget is ready");
  });  document.addEventListener('AppstleSubscription:SubscriptionWidget:SellingPlanSelected', function() {
    const checkedInput = document.querySelector('.appstle_sub_widget input[name="selling_plan"]:checked');
    console.log('selling plan', checkedInput ? checkedInput.value : null);
    // Do your custom actions here
  });
