(function() {
 
  'use strict';

  function formatMoney(cents) {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(cents / 100);
  }

  // Use event delegation on document level for clicks
  document.addEventListener('click', function(e) {
    const option = e.target.closest('.selling-plan-option');
    if (!option) return;

    const picker = option.closest('.selling-plan-picker');
    if (!picker) return;

    const sectionId = picker.dataset.section;
    const options = picker.querySelectorAll('.selling-plan-option');
    const input = picker.querySelector('.selling-plan-input');
    const sellingPlanId = option.dataset.sellingPlanId || '';
    
    // Update visual selection
    options.forEach(opt => opt.classList.remove('selected'));
    option.classList.add('selected');
    
    // Update hidden input
    if (input) {
      input.value = sellingPlanId;
    }

    // Update prices
    const price = option.dataset.price;
    const comparePrice = option.dataset.comparePrice;
    const priceBlock = document.querySelector(`#price-${sectionId}`);
    
    // Check if we need to fetch a different product based on metafields
    const productInfo = document.querySelector(`product-info[data-section="${sectionId}"]`);
    if (productInfo) {
      const isOneTime = !sellingPlanId || sellingPlanId.trim() === '';
      const isSubscription = !isOneTime;
      
      let productUrl = null;
      
      if (isOneTime && productInfo.dataset.oneTimeProductUrl) {
        // One-time clicked and metafield exists
        productUrl = productInfo.dataset.oneTimeProductUrl;
      } else if (isSubscription && productInfo.dataset.subscriptionProductUrl) {
        // Subscription clicked and metafield exists
        productUrl = productInfo.dataset.subscriptionProductUrl;
      }
      
      if (productUrl) {
        // Fetch the new product using Section API
        fetchProductAndRender(productUrl, sectionId, productInfo, sellingPlanId);
        return; // Exit early, don't dispatch price update event yet
      }
    }
    
    if (priceBlock) {
      const event = new CustomEvent('selling-plan-changed', {
        detail: {
          price: price,
          comparePrice: comparePrice,
          sellingPlanId: sellingPlanId
        }
      });
      document.dispatchEvent(event);
    }
  });

  // Function to fetch product and render using Section API
  function fetchProductAndRender(productUrl, sectionId, productInfoElement, sellingPlanId) {
    // Show loading state
    productInfoElement.classList.add('product-loading');
    productInfoElement.style.opacity = '0.6';
    productInfoElement.style.pointerEvents = 'none';
    
    // Build request URL with section_id parameter for Section API
    const requestUrl = `${productUrl}?section_id=${sectionId}`;
    
    fetch(requestUrl, {
      headers: {
        'Accept': 'text/html',
      }
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text();
      })
      .then((responseText) => {
        const html = new DOMParser().parseFromString(responseText, 'text/html');
        const newProductInfo = html.querySelector(`product-info[data-section="${sectionId}"]`);
        
        if (newProductInfo) {
          // Remove loading state
          productInfoElement.classList.remove('product-loading');
          productInfoElement.style.opacity = '';
          productInfoElement.style.pointerEvents = '';
          
          // Use HTMLUpdateUtility if available (from product-info.js pattern)
          let activeProductInfo = productInfoElement;
          if (window.HTMLUpdateUtility) {
            window.HTMLUpdateUtility.viewTransition(
              productInfoElement,
              newProductInfo,
              [],
              [
                // Post-process callback to get reference to new node and update data attributes
                function(newNode) {
                  activeProductInfo = newNode;
                  // Update data attributes from the new product info element
                  if (newProductInfo.dataset.productId) {
                    newNode.dataset.productId = newProductInfo.dataset.productId;
                  }
                  if (newProductInfo.dataset.url) {
                    newNode.dataset.url = newProductInfo.dataset.url;
                  }
                  if (newProductInfo.dataset.oneTimeProductId) {
                    newNode.dataset.oneTimeProductId = newProductInfo.dataset.oneTimeProductId;
                  } else {
                    delete newNode.dataset.oneTimeProductId;
                  }
                  if (newProductInfo.dataset.subscriptionProductId) {
                    newNode.dataset.subscriptionProductId = newProductInfo.dataset.subscriptionProductId;
                  } else {
                    delete newNode.dataset.subscriptionProductId;
                  }
                  if (newProductInfo.dataset.oneTimeProductUrl) {
                    newNode.dataset.oneTimeProductUrl = newProductInfo.dataset.oneTimeProductUrl;
                  } else {
                    delete newNode.dataset.oneTimeProductUrl;
                  }
                  if (newProductInfo.dataset.subscriptionProductUrl) {
                    newNode.dataset.subscriptionProductUrl = newProductInfo.dataset.subscriptionProductUrl;
                  } else {
                    delete newNode.dataset.subscriptionProductUrl;
                  }
                }
              ]
            );
          } else {
            // Fallback: replace innerHTML
            productInfoElement.innerHTML = newProductInfo.innerHTML;
            // Update data attributes
            if (newProductInfo.dataset.productId) {
              productInfoElement.dataset.productId = newProductInfo.dataset.productId;
            }
            if (newProductInfo.dataset.url) {
              productInfoElement.dataset.url = newProductInfo.dataset.url;
            }
            if (newProductInfo.dataset.oneTimeProductId) {
              productInfoElement.dataset.oneTimeProductId = newProductInfo.dataset.oneTimeProductId;
            } else {
              delete productInfoElement.dataset.oneTimeProductId;
            }
            if (newProductInfo.dataset.subscriptionProductId) {
              productInfoElement.dataset.subscriptionProductId = newProductInfo.dataset.subscriptionProductId;
            } else {
              delete productInfoElement.dataset.subscriptionProductId;
            }
            if (newProductInfo.dataset.oneTimeProductUrl) {
              productInfoElement.dataset.oneTimeProductUrl = newProductInfo.dataset.oneTimeProductUrl;
            } else {
              delete productInfoElement.dataset.oneTimeProductUrl;
            }
            if (newProductInfo.dataset.subscriptionProductUrl) {
              productInfoElement.dataset.subscriptionProductUrl = newProductInfo.dataset.subscriptionProductUrl;
            } else {
              delete productInfoElement.dataset.subscriptionProductUrl;
            }
          }
          
          // Update URL
          if (productInfoElement.dataset.updateUrl === 'true') {
            window.history.replaceState({}, '', productUrl);
          }
          
          // Dispatch selling-plan-changed event after product is loaded
          // Use requestAnimationFrame to ensure DOM is fully updated
          requestAnimationFrame(function() {
            setTimeout(function() {
              // Get the active product-info element (might be new node after viewTransition)
              const currentProductInfo = document.querySelector(`product-info[data-section="${sectionId}"]`);
              
              // Reinitialize selection based on the new product - run multiple times to ensure it takes
              initDefaultSelection();
              
              // Run again after a short delay to override any Liquid defaults
              setTimeout(function() {
                initDefaultSelection();
                
                // Re-initialize bundle variant prices from the new HTML (clear old data first)
                document.querySelectorAll('.bundle-variant-option').forEach(option => {
                  delete option.dataset.originalPrice;
                  delete option.dataset.originalComparePrice;
                });
                initializeBundleVariantPrices();
                
                const priceBlock = document.querySelector(`#price-${sectionId}`);
                if (priceBlock) {
                  const priceText = priceBlock.querySelector('.price__regular .price-item--regular')?.textContent || 
                                   priceBlock.querySelector('.price__sale .price-item--sale')?.textContent;
                  const comparePriceText = priceBlock.querySelector('.price__sale .price-item--regular')?.textContent;
                  
                  // Get the currently selected option to get the correct sellingPlanId and price
                  const picker = document.querySelector(`.selling-plan-picker[data-section="${sectionId}"]`);
                  let currentSellingPlanId = '';
                  let currentPrice = null;
                  let currentComparePrice = null;
                  
                  if (picker) {
                    const selectedOption = picker.querySelector('.selling-plan-option.selected');
                    if (selectedOption) {
                      currentSellingPlanId = selectedOption.dataset.sellingPlanId || '';
                      // Get numeric prices from data attributes (in cents)
                      const priceAttr = selectedOption.dataset.price;
                      const comparePriceAttr = selectedOption.dataset.comparePrice;
                      if (priceAttr) {
                        currentPrice = parseInt(priceAttr, 10);
                      }
                      if (comparePriceAttr) {
                        currentComparePrice = parseInt(comparePriceAttr, 10);
                      }
                    }
                  }
                  
                  // If we couldn't get prices from the option, parse from text
                  if (currentPrice === null && priceText) {
                    currentPrice = parsePriceToCents(priceText);
                  }
                  if (currentComparePrice === null && comparePriceText) {
                    currentComparePrice = parsePriceToCents(comparePriceText);
                  } else if (currentComparePrice === null) {
                    currentComparePrice = currentPrice;
                  }
                  
                  const event = new CustomEvent('selling-plan-changed', {
                    detail: {
                      price: currentPrice, // Pass numeric price in cents
                      comparePrice: currentComparePrice, // Pass numeric compare price in cents
                      sellingPlanId: currentSellingPlanId
                    }
                  });
                  document.dispatchEvent(event);
                }
                
                // Trigger product-info:loaded event on the active element
                if (currentProductInfo) {
                  currentProductInfo.dispatchEvent(new CustomEvent('product-info:loaded', { bubbles: true }));
                }
              }, 150);
            }, 50);
          });
        } else {
          throw new Error('Product section not found in response');
        }
      })
      .catch((error) => {
        console.error('Error fetching product:', error);
        // Remove loading state on error
        productInfoElement.classList.remove('product-loading');
        productInfoElement.style.opacity = '';
        productInfoElement.style.pointerEvents = '';
        // Optionally show error message
        alert('Error loading product. Please try again.');
      });
  }

  // Initialize default selection on page load
  function initDefaultSelection() {
    document.querySelectorAll('.selling-plan-picker').forEach(picker => {
      const sectionId = picker.dataset.section;
      const productInfo = document.querySelector(`product-info[data-section="${sectionId}"]`);
      
      if (!productInfo) return;
      
      const currentProductId = productInfo.dataset.productId;
      const oneTimeProductId = productInfo.dataset.oneTimeProductId;
      const subscriptionProductId = productInfo.dataset.subscriptionProductId;
      
      const subscriptionOption = picker.querySelector('.selling-plan-option--subscription');
      const onetimeOption = picker.querySelector('.selling-plan-option--onetime');
      const input = picker.querySelector('.selling-plan-input');
      
      if (!subscriptionOption || !onetimeOption) return;
      
      // Determine which option should be selected based on current product
      // Logic:
      // - If product has subscription_product metafield set, it means this product IS the one-time product
      // - If product has one_time_product metafield set, it means this product IS the subscription product
      let shouldSelectSubscription = false;
      let shouldSelectOneTime = false;
      
      // Check if metafields exist (not empty)
      const hasSubscriptionProductMetafield = subscriptionProductId && subscriptionProductId.trim() !== '';
      const hasOneTimeProductMetafield = oneTimeProductId && oneTimeProductId.trim() !== '';
      
      if (hasSubscriptionProductMetafield) {
        // Product has subscription_product metafield → this IS the one-time product
        shouldSelectOneTime = true;
      } else if (hasOneTimeProductMetafield) {
        // Product has one_time_product metafield → this IS the subscription product
        shouldSelectSubscription = true;
      }
      
      // Always update selection - remove all selections first
      subscriptionOption.classList.remove('selected');
      onetimeOption.classList.remove('selected');
      
      // Update selection based on product type
      if (shouldSelectSubscription) {
        // Select subscription
        subscriptionOption.classList.add('selected');
        if (input) {
          const sellingPlanId = subscriptionOption.dataset.sellingPlanId || '';
          input.value = sellingPlanId;
        }
      } else if (shouldSelectOneTime) {
        // Select one-time
        onetimeOption.classList.add('selected');
        if (input) {
          input.value = '';
        }
      } else {
        // Default behavior: if no match, select subscription (default)
        subscriptionOption.classList.add('selected');
        if (input) {
          const sellingPlanId = subscriptionOption.dataset.sellingPlanId || '';
          input.value = sellingPlanId;
        }
      }
    });
  }

  // Listen for variant changes to update prices
  document.addEventListener('variant:change', function(event) {
    const variant = event.detail?.variant;
    if (!variant) return;

    document.querySelectorAll('.selling-plan-picker').forEach(picker => {
      if (variant.selling_plan_allocations && variant.selling_plan_allocations.length > 0) {
        const allocation = variant.selling_plan_allocations[0];
        const subscriptionOption = picker.querySelector('.selling-plan-option--subscription');
        const onetimeOption = picker.querySelector('.selling-plan-option--onetime');
        
        if (subscriptionOption) {
          subscriptionOption.dataset.price = allocation.price;
          subscriptionOption.dataset.sellingPlanId = allocation.selling_plan.id;
          const priceEl = subscriptionOption.querySelector('.selling-plan-option__price');
          const comparePriceEl = subscriptionOption.querySelector('.selling-plan-option__compare-price');
          if (priceEl) priceEl.textContent = formatMoney(allocation.price);
          if (comparePriceEl) comparePriceEl.textContent = formatMoney(variant.compare_at_price || variant.price);
        }
        
        if (onetimeOption) {
          onetimeOption.dataset.price = variant.price;
          onetimeOption.dataset.comparePrice = variant.compare_at_price;
          const priceEl = onetimeOption.querySelector('.selling-plan-option__price');
          if (priceEl) priceEl.textContent = formatMoney(variant.price);
          
          if (variant.compare_at_price > variant.price) {
            let compareEl = onetimeOption.querySelector('.selling-plan-option__compare-price');
            if (!compareEl) {
              const priceContainer = onetimeOption.querySelector('.selling-plan-option__price-container');
              if (priceContainer && priceEl) {
                compareEl = document.createElement('del');
                compareEl.className = 'selling-plan-option__compare-price';
                priceContainer.insertBefore(compareEl, priceEl);
              }
            }
            if (compareEl) {
              compareEl.textContent = formatMoney(variant.compare_at_price);
              compareEl.style.display = 'inline';
            }
          } else {
            const compareEl = onetimeOption.querySelector('.selling-plan-option__compare-price');
            if (compareEl) compareEl.style.display = 'none';
          }
        }

        // Update hidden input if subscription is selected
        const input = picker.querySelector('.selling-plan-input');
        const isSubscriptionSelected = picker.querySelector('.selling-plan-option--subscription.selected');
        if (input && isSubscriptionSelected) {
          input.value = allocation.selling_plan.id;
        }
        
        // Always check subscription state and update bundle variants accordingly
        setTimeout(function() {
          // Initialize prices first if needed
          initializeBundleVariantPrices();
          
          if (isSubscriptionSelected) {
            // Subscription is selected, apply discount
            const event = new CustomEvent('selling-plan-changed', {
              detail: {
                price: allocation.price,
                comparePrice: variant.compare_at_price || variant.price,
                sellingPlanId: allocation.selling_plan.id
              }
            });
            document.dispatchEvent(event);
          } else {
            // One-time purchase is selected, reset to original prices
            const event = new CustomEvent('selling-plan-changed', {
              detail: {
                price: variant.price,
                comparePrice: variant.compare_at_price,
                sellingPlanId: ''
              }
            });
            document.dispatchEvent(event);
          }
        }, 100);
      } else {
        // No selling plans available, reset to original prices
        setTimeout(function() {
          // Initialize prices first if needed
          initializeBundleVariantPrices();
          const event = new CustomEvent('selling-plan-changed', {
            detail: {
              price: variant.price,
              comparePrice: variant.compare_at_price,
              sellingPlanId: ''
            }
          });
          document.dispatchEvent(event);
        }, 100);
      }
    });
  });

  // Helper function to parse price string to cents
  function parsePriceToCents(priceText) {
    // Remove currency symbols and spaces, then parse
    // Handles formats like "£12.99", "$12.99", "12.99", etc.
    const cleaned = priceText.replace(/[^\d.,]/g, '').replace(',', '');
    const price = parseFloat(cleaned);
    if (isNaN(price)) return 0;
    return Math.round(price * 100); // Convert to cents
  }

  // Listen for selling plan changes to update bundle variant options
  document.addEventListener('selling-plan-changed', function(event) {
    let { price: subscriptionPrice, comparePrice, sellingPlanId } = event.detail;
    
    // Convert price to numeric if it's a string
    if (typeof subscriptionPrice === 'string') {
      subscriptionPrice = parsePriceToCents(subscriptionPrice);
    }
    if (typeof comparePrice === 'string') {
      comparePrice = parsePriceToCents(comparePrice);
    }
    
    // Get current variant to calculate discount percentage
    const variantSelects = document.querySelector('variant-selects');
    const selectedVariantData = variantSelects?.querySelector('[data-selected-variant]')?.innerHTML;
    if (!selectedVariantData) {
      // If no variant data, just re-initialize bundle prices and return
      initializeBundleVariantPrices();
      return;
    }
    
    const currentVariant = JSON.parse(selectedVariantData);
    
    // If switching to one-time purchase (sellingPlanId is empty)
    if (!sellingPlanId) {
      // Reset all bundle variant options to original prices
      document.querySelectorAll('.bundle-variant-option').forEach(option => {
        resetBundleVariantToOriginal(option);
      });
      return;
    }
    
    // Ensure we have valid numeric prices
    if (!subscriptionPrice || isNaN(subscriptionPrice) || !currentVariant.price || isNaN(currentVariant.price)) {
      console.warn('Invalid prices for bundle variant calculation', { subscriptionPrice, variantPrice: currentVariant.price });
      return;
    }
    
    // Calculate subscription discount percentage from selling plan
    // Subscription discount is based on regular price, not compare_at_price
    const subscriptionDiscountPercentage = ((currentVariant.price - subscriptionPrice) / currentVariant.price) * 100;
    
    // Update all bundle variant options
    document.querySelectorAll('.bundle-variant-option').forEach(option => {
      const input = option.previousElementSibling;
      if (!input || !input.dataset.variantId) return;
      
      // Initialize prices if not already stored (uses data attributes from Liquid or parses DOM)
      initializeBundleVariantPrices();
      
      // Get original prices (will be set by initializeBundleVariantPrices if not already)
      if (!option.dataset.originalPrice) {
        return; // Skip if we can't get original price
      }
      
      const originalPrice = parseInt(option.dataset.originalPrice, 10);
      const originalComparePrice = parseInt(option.dataset.originalComparePrice, 10) || originalPrice;
      
      // Use compare_at_price as base if available, otherwise use original_price
      const basePrice = originalComparePrice > originalPrice ? originalComparePrice : originalPrice;
      
      // Calculate subscription price: apply subscription discount to original price
      const subscriptionPriceForVariant = Math.round(originalPrice * (1 - subscriptionDiscountPercentage / 100));
      
      // Calculate total discount percentage: (base_price - subscription_price) / base_price * 100
      // This accounts for both compare_at_price discount and subscription discount
      const totalDiscountPercentage = basePrice > subscriptionPriceForVariant 
        ? ((basePrice - subscriptionPriceForVariant) / basePrice) * 100 
        : 0;
      
      updateBundleVariantPrices(option, subscriptionPriceForVariant, originalComparePrice, totalDiscountPercentage);
    });
  });

  // Helper function to reset bundle variant to original prices
  function resetBundleVariantToOriginal(option) {
    if (!option.dataset.originalPrice) return;
    
    const originalPrice = parseInt(option.dataset.originalPrice, 10);
    const originalComparePrice = parseInt(option.dataset.originalComparePrice, 10) || originalPrice;
    
    // Calculate discount from compare_at_price if available
    const basePrice = originalComparePrice > originalPrice ? originalComparePrice : originalPrice;
    const discountPercentage = basePrice > originalPrice 
      ? ((basePrice - originalPrice) / basePrice) * 100 
      : 0;
    
    updateBundleVariantPrices(option, originalPrice, originalComparePrice, discountPercentage);
  }

  // Helper function to update bundle variant option prices
  function updateBundleVariantPrices(option, subscriptionPrice, comparePrice, discountPercentage) {
    // Validate inputs
    if (subscriptionPrice === null || isNaN(subscriptionPrice) || subscriptionPrice < 0) {
      console.warn('Invalid subscription price for bundle variant', subscriptionPrice);
      return;
    }
    
    // Update price
    const priceEl = option.querySelector('.bundle-price');
    if (priceEl) {
      priceEl.textContent = formatMoney(subscriptionPrice);
    }
    
    // Update compare price
    const compareEl = option.querySelector('.bundle-compare-price');
    if (comparePrice !== null && !isNaN(comparePrice) && subscriptionPrice !== null) {
      if (comparePrice > subscriptionPrice) {
        if (!compareEl) {
          // Create compare price element if it doesn't exist
          const priceContainer = option.querySelector('.bundle-price-container');
          if (priceContainer && priceEl) {
            const newCompareEl = document.createElement('del');
            newCompareEl.className = 'bundle-compare-price';
            priceContainer.insertBefore(newCompareEl, priceEl);
            newCompareEl.textContent = formatMoney(comparePrice);
          }
        } else {
          compareEl.textContent = formatMoney(comparePrice);
          compareEl.style.display = '';
        }
      } else if (compareEl) {
        compareEl.style.display = 'none';
      }
    }
    
    // Update discount badge
    const discountBadge = option.querySelector('.bundle-discount-badge');
    if (discountPercentage !== null && !isNaN(discountPercentage) && discountPercentage > 0) {
      if (!discountBadge) {
        const badge = document.createElement('span');
        badge.className = 'bundle-discount-badge';
        badge.textContent = `${Math.round(discountPercentage)}% Off`;
        option.insertBefore(badge, option.firstChild);
      } else {
        discountBadge.textContent = `${Math.round(discountPercentage)}% Off`;
        discountBadge.style.display = '';
      }
    } else if (discountBadge) {
      discountBadge.style.display = 'none';
    }
    
    // Update unit price (per-unit price)
    const unitPriceEl = option.querySelector('.bundle-unit-price-amount');
    if (unitPriceEl && subscriptionPrice !== null && !isNaN(subscriptionPrice)) {
      // Extract quantity from variant title (e.g., "4 Boxes" -> 4)
      const titleEl = option.querySelector('.bundle-variant-title');
      if (titleEl) {
        const titleText = titleEl.textContent.trim();
        const quantityMatch = titleText.match(/^(\d+)/);
        if (quantityMatch) {
          const quantity = parseInt(quantityMatch[1], 10);
          if (quantity > 0 && !isNaN(quantity)) {
            const perUnitPrice = Math.round(subscriptionPrice / quantity);
            if (!isNaN(perUnitPrice) && perUnitPrice >= 0) {
              unitPriceEl.textContent = formatMoney(perUnitPrice);
            }
          }
        }
      }
    }
  }

  // Store original prices for bundle variant options on initialization
  function initializeBundleVariantPrices() {
    document.querySelectorAll('.bundle-variant-option').forEach(option => {
      // Use data attributes if available (from Liquid template), otherwise parse from DOM
      if (!option.dataset.originalPrice) {
        // Fallback to parsing from DOM if not set by Liquid
        const priceEl = option.querySelector('.bundle-price');
        if (priceEl) {
          const priceText = priceEl.textContent.trim();
          option.dataset.originalPrice = parsePriceToCents(priceText).toString();
        }
      }
      
      if (!option.dataset.originalComparePrice) {
        // Fallback to parsing from DOM if not set by Liquid
        const compareEl = option.querySelector('.bundle-compare-price');
        if (compareEl) {
          const compareText = compareEl.textContent.trim();
          option.dataset.originalComparePrice = parsePriceToCents(compareText).toString();
        } else {
          // Use original price as compare price if no compare price exists
          option.dataset.originalComparePrice = option.dataset.originalPrice || '0';
        }
      }
    });
  }

  // Initialize on load with a small delay to ensure DOM is ready
  function initializeOnLoad() {
    // Use requestAnimationFrame to ensure DOM is fully rendered
    requestAnimationFrame(function() {
      setTimeout(function() {
        initDefaultSelection();
        initializeBundleVariantPrices();
      }, 100);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeOnLoad);
  } else {
    initializeOnLoad();
  }

  // Re-initialize default selection after HTML updates
  document.addEventListener('product-info:loaded', function() {
    setTimeout(function() {
      initDefaultSelection();
      initializeBundleVariantPrices();
    }, 100);
  });
  document.addEventListener('variant:change', function() {
    setTimeout(function() {
      initDefaultSelection();
      initializeBundleVariantPrices();
    }, 50);
  });
})();
