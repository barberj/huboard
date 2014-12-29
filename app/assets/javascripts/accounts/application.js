;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
XPaneComponent = Ember.Component.extend({
  didInsertElement: function() {
    this.get('parentView').addPane(this);
  },

  selected: function() {
    return this.get('parentView.selected') === this;
  }.property('parentView.selected')
});

module.exports = XPaneComponent;

},{}],2:[function(require,module,exports){
XTabsComponent = Ember.Component.extend({
  init: function() {
    this._super.apply(this, arguments);
    this.panes = [];
  },

  addPane: function(pane) {
    if (this.get('panes.length') == 0) this.select(pane);
    this.panes.pushObject(pane);
  },

  select: function(pane) {
    this.set('selected', pane);
  }
});

module.exports = XTabsComponent;

},{}],3:[function(require,module,exports){
App = Ember.Application.create({
  rootElement : "#main-application"
});

App.animateModalClose = function() {
  var promise = new Ember.RSVP.defer();

  $('body').removeClass("fullscreen-open");
  promise.resolve();


  return promise.promise;
};

App.animateModalOpen = function() {
  var promise = new Ember.RSVP.defer();

   $('body').addClass("fullscreen-open");
  promise.resolve();
  

  return promise.promise;
};

Ember.TextSupport.reopen({
  attributeBindings: ["data-stripe", "autocomplete", "autocompletetype", "required"]
});

App.CvcField = Ember.TextField.extend({
  required: true,
  autocompletetype: "cc-csc",
  format: "123",
  placeholder: Ember.computed.alias("format"),
  autocomplete: "off",
  didInsertElement: function() {
    return this.$().payment("formatCardCVC");
  }
});

App.CardNumberField = Ember.TextField.extend({
  required: true,
  autocompletetype: "cc-number",
  format: "1234 5678 9012 3456",
  placeholder: Ember.computed.alias("format"),
  didInsertElement: function() {
    return this.$().payment("formatCardNumber");
  }
});

App.CardExpiryField = Ember.TextField.extend({
  required: true,
  autocompletetype: "cc-exp",
  format: "MM / YY",
  placeholder: Ember.computed.alias("format"),
  didInsertElement: function() {
    return this.$().payment("formatCardExpiry");
  }
});

App.CouponCodeField = Ember.TextField.extend({
  required: false,
  format: "CODE",
  placeholder: Ember.computed.alias("format"),
  change: function() {
    var controller;
    controller = this.get('targetObject');
    return controller.send('couponChanged');
  }
});

App.CouponCheckbox = Ember.Checkbox.extend({
  required: false
});

module.exports = App;

},{}],4:[function(require,module,exports){
var App = require('./app');

App.Router.map(function(){
  this.resource("profile", { path: "/:profile_id" });
});

},{"./app":3}],5:[function(require,module,exports){
AccountController = Ember.ObjectController.extend({
  needs: ["purchaseForm","cancelForm", "updateCard", "applyCoupon"],  
  couponCode: function(){
    return this.get("model.details.discount.coupon.id");
  }.property("model.details.discount","model.details.discount.coupon", "model.details.discount.coupon.id"),
  actions: {
    purchase: function (model) {
      var org = this.get("model.details.org");
      var details = this.get('model.details');
      plan = Ember.Object.create({plan: model, org:org, details: details})
      this.set("controllers.purchaseForm.model", plan)
      this.send("openModal","purchaseForm")
    },
    updateCard: function (model) {
      var org = this.get("model.details.org");
      card = Ember.Object.create({card: model, org:org})
      this.set("controllers.updateCard.model", card)
      this.send("openModal","updateCard")
    },
    cancel: function (model) {
      var org = this.get("model.details.org");
      var details = this.get('model.details');
      plan = Ember.Object.create({plan: model, org:org, details: details})
      this.set("controllers.cancelForm.model", plan)
      this.send("openModal","cancelForm")
    
    },
    applyCoupon: function (model) {
      this.set("controllers.applyCoupon.model", model)
      this.send("openModal","applyCoupon");
    }
  }  
});

module.exports = AccountController;

},{}],6:[function(require,module,exports){
ApplicationController = Ember.Controller.extend();

module.exports = ApplicationController;

},{}],7:[function(require,module,exports){
require("./coupon_controller");

ApplyCouponController = Ember.ObjectController.extend(CouponController, {
  coupon: null,
  customer: Ember.computed.alias('model.details.card.customer'),
  isDisabled: (function() {
    return this.get('errors') || this.get('processingAction');
  }).property('errors'),
  actions: {
    apply_coupon: function() {
      var coupon_id, customer;
      coupon_id = this.get('coupon');
      customer = this.get('customer');
      this.set('processingAction', true);
      return this.ajax("/settings/redeem_coupon/" + customer, {
        coupon: coupon_id
      }, "PUT").then(this.didAcceptCoupon.bind(this), this.didRejectCoupon.bind(this));
    },
    couponChanged: function() {
      var coupon_id, success;
      coupon_id = this.get('coupon');
      if (coupon_id === "") {
        return this.clearCouponAlerts();
      }
      return this.ajax("/settings/coupon_valid/" + coupon_id, {}, "GET").then(success = (function() {}), this.didRejectCoupon.bind(this));
    },
    close: function() {
      return this.send("closeModal");
    }
  }
});

module.exports = ApplyCouponController

},{"./coupon_controller":9}],8:[function(require,module,exports){
CancelFormController = Ember.Controller.extend({
  processingAction: false,
  actions: {
    close: function() {
      return this.send("closeModal");
    },
    cancel: function() {
      this.set('processingAction', true);
      return this.ajax("/settings/profile/" + this.get("model.org.login") + "/plans/" + this.get('model.plan.id'), {}).then(this.didCancel.bind(this), this.cancelDidError.bind(this));
    }
  },
  didCancel: function() {
    this.set('model.details.has_plan', false);
    this.set('model.details.discount', null);
    this.set('processingAction', false);
    this.set("model.plan.purchased", false);
    this.set("model.details.card", null);
    return this.send("closeModal");
  },
  cancelDidError: function(error) {
    this.set('errors', error.responseJSON.error.message);
    return this.set('processingAction', false);
  },
  ajax: function(url, data) {
    var controller;
    controller = this;
    return new Ember.RSVP.Promise(function(resolve, reject) {
      var hash;
      hash = {};
      hash.url = url;
      hash.type = 'DELETE';
      hash.context = controller;
      hash.data = data;
      hash.success = function(json) {
        return resolve(json);
      };
      hash.error = function(jqXHR, textStatus, errorThrown) {
        return reject(jqXHR);
      };
      return Ember.$.ajax(hash);
    });
  }
});

module.exports = CancelFormController;

},{}],9:[function(require,module,exports){
CouponController = Ember.Mixin.create({
  processingAction: false,
  onCouponChange: (function() {
    var errors;
    errors = this.get('errors');
    if (errors) {
      return this.set('errors', null);
    }
  }).observes('coupon'),
  ajax: function(url, data, verb) {
    var controller;
    controller = this;
    return new Ember.RSVP.Promise(function(resolve, reject) {
      var hash;
      hash = {};
      hash.url = url;
      hash.type = verb || 'GET';
      hash.context = controller;
      hash.data = data;
      hash.success = function(json) {
        return resolve(json);
      };
      hash.error = function(jqXHR, textStatus, errorThrown) {
        return reject(jqXHR);
      };
      return Ember.$.ajax(hash);
    });
  },
  didRejectCoupon: function(error, statusText) {
    this.set('errors', JSON.parse(error.responseText).error.message);
    return this.set('processingAction', false);
  },
  didAcceptCoupon: function(response) {
    this.send('close');
    this.set('processingAction', false);
    return this.set('model.details.discount', response.discount);
  },
  clearCouponAlerts: function() {
    return this.set('errors', null);
  }  
});

module.exports = CouponController;

},{}],10:[function(require,module,exports){
CreditCardForm = Ember.Controller.extend({
  actions: {
    close: function() {
      return this.send("closeModal");
    }
  },
  key: HuboardEnv.stripe_pub_key,
  processingCard: false,
  number: null,
  cvc: null,
  exp: null,
  expMonth: (function() {
    if (this.get("exp")) {
      return Ember.$.payment.cardExpiryVal(this.get("exp")).month || "MM";
    }
    return "MM";
  }).property("exp"),
  expYear: (function() {
    if (this.get("exp")) {
      return Ember.$.payment.cardExpiryVal(this.get("exp")).year || "YYYY";
    }
    return "YYYY";
  }).property("exp"),
  cardType: (function() {
    return Ember.$.payment.cardType(this.get('number'));
  }).property('number'),
  process: function() {
    this.set('processingCard', true);
    Stripe.setPublishableKey(this.get('key'));
    return Stripe.card.createToken({
      number: this.get('number'),
      cvc: this.get('cvc'),
      exp_month: this.get('expMonth'),
      exp_year: this.get('expYear')
    }, this.didProcessToken.bind(this));
  }
});

module.exports = CreditCardForm;

},{}],11:[function(require,module,exports){
HistoryController = Ember.ObjectController.extend({
  actions: {
    saveAdditionalInfo: function (model) {
      controller = this;
      controller.set("processing", true);
      return new Ember.RSVP.Promise(function(resolve, reject){
        Ember.$.ajax({
          url: "/settings/profile/" + model.get("login") + "/additionalInfo",
          type: "PUT",
          data: {
            additional_info: model.get("history.additional_info")
          },
          success: function(response){
            resolve(response);
            controller.set("processing", false);
          },
          error: function(response){
            reject(response);
            controller.set("processing", false);
          }
        })
      })
    }
  }
});

module.exports = HistoryController;

},{}],12:[function(require,module,exports){
require("./credit_card_form_controller");

PurchaseFormController =  CreditCardForm.extend({
  coupon: null,
  isDisabled: (function() {
    return this.get("isProcessing") || this.get('errors');
  }).property("isProcessing", "errors"),
  onCouponChange: (function() {
    var errors;
    errors = this.get('errors');
    if (errors) {
      return this.set('errors', null);
    }
  }).observes('coupon'),
  price: (function() {
    return this.get("model.amount");
  }).property("plan.amount"),
  didProcessToken: function(status, response) {
    if (response.error) {
      this.set('processingCard', false);
      return this.set('errors', response.error.message);
    } else {
      return this.postCharge(response);
    }
  },
  postCharge: function(token) {
    return this.ajax("/settings/charge/" + this.get("model.org.login"), {
      email: this.get("model.org.billing_email"),
      card: token,
      coupon: this.get("coupon"),
      plan: this.get("model.plan")
    }).then(this.didPurchase.bind(this), this.purchaseDidError.bind(this));
  },
  didPurchase: function(response) {
    this.set('processingCard', false);
    this.set("model.plan.purchased", true);
    this.set("model.details.card", response.card);
    this.set('model.details.discount', response.discount);
    this.set('model.details.has_plan', true);
    return this.send("close");
  },
  purchaseDidError: function(error) {
    this.set('errors', JSON.parse(error.responseText).error.message);
    return this.set('processingCard', false);
  },
  didRejectCoupon: function(error, statusText) {
    return this.set('errors', JSON.parse(error.responseText).error.message);
  },
  clearCouponAlerts: function() {
    return this.set('errors', null);
  },
  ajax: function(url, data, verb) {
    var controller;
    controller = this;
    return new Ember.RSVP.Promise(function(resolve, reject) {
      var hash;
      hash = {};
      hash.url = url;
      hash.type = verb || 'POST';
      hash.context = controller;
      hash.data = data;
      hash.success = function(json) {
        return resolve(json);
      };
      hash.error = function(jqXHR, textStatus, errorThrown) {
        return reject(jqXHR);
      };
      return Ember.$.ajax(hash);
    });
  },
  actions: {
    couponChanged: function() {
      var coupon_id, success;
      coupon_id = this.get('coupon');
      if (coupon_id === "") {
        return this.clearCouponAlerts();
      }
      return this.ajax("/settings/coupon_valid/" + coupon_id, {}, "GET").then(success = (function() {}), this.didRejectCoupon.bind(this));
    }
  }
});

module.exports = PurchaseFormController;

},{"./credit_card_form_controller":10}],13:[function(require,module,exports){
require("./credit_card_form_controller");

UpdateCardController = CreditCardForm.extend({
  didProcessToken: function(status, response) {
    if (response.error) {
      this.set('processingCard', false);
      return this.set('errors', response.error.message);
    } else {
      this.set('errors', "");
      return this.postUpdate(response);
    }
  },
  postUpdate: function(token) {
    return this.ajax("/settings/profile/" + this.get("model.org.login") + "/card", {
      email: this.get("model.org.billing_email"),
      card: token
    }).then(this.didUpdate.bind(this));
  },
  didUpdate: function(response) {
    this.set('processingCard', false);
    this.set('model.card.details.card', response.card);
    return this.send("close");
  },
  ajax: function(url, data) {
    var controller;
    controller = this;
    return new Ember.RSVP.Promise(function(resolve, reject) {
      var hash;
      hash = {};
      hash.url = url;
      hash.type = 'PUT';
      hash.context = controller;
      hash.data = data;
      hash.success = function(json) {
        return resolve(json);
      };
      hash.error = function(jqXHR, textStatus, errorThrown) {
        return reject(jqXHR);
      };
      return Ember.$.ajax(hash);
    });
  } 
});

module.exports = UpdateCardController;

},{"./credit_card_form_controller":10}],14:[function(require,module,exports){
Handlebars.registerHelper("stripe-money", function(path) {
  var value = Ember.getPath(this, path);
  return "$" + parseFloat(value/100).toFixed(0);
});

Handlebars.registerHelper("stripe-date", function(path) {
  var value = Ember.getPath(this, path);
  var date = new Date(value * 1000);
  return date.toDateString();
});

window.stripe_pub_key = '<%= ENV["STRIPE_PUBLISHABLE_API"] %>'

},{}],15:[function(require,module,exports){
// This file is auto-generated by `ember build`.
// You should not modify it.

var App = window.App = require('./config/app');
require('./templates');
require('./helpers/stripe');


App.XPaneComponent = require('./components/x_pane_component');
App.XTabsComponent = require('./components/x_tabs_component');
App.AccountController = require('./controllers/account_controller');
App.ApplicationController = require('./controllers/application_controller');
App.ApplyCouponController = require('./controllers/apply_coupon_controller');
App.CancelFormController = require('./controllers/cancel_form_controller');
App.CouponController = require('./controllers/coupon_controller');
App.CreditCardFormController = require('./controllers/credit_card_form_controller');
App.HistoryController = require('./controllers/history_controller');
App.PurchaseFormController = require('./controllers/purchase_form_controller');
App.UpdateCardController = require('./controllers/update_card_controller');
App.Org = require('./models/org');
App.User = require('./models/user');
App.ApplicationRoute = require('./routes/application_route');
App.IndexRoute = require('./routes/index_route');
App.LoadingRoute = require('./routes/loading_route');
App.ProfileRoute = require('./routes/profile_route');
App.ApplyCouponView = require('./views/apply_coupon_view');
App.CancelFormView = require('./views/cancel_form_view');
App.LoadingView = require('./views/loading_view');
App.ModalView = require('./views/modal_view');
App.PurchaseFormView = require('./views/purchase_form_view');
App.UpdateCardView = require('./views/update_card_view');

require('./config/routes');

module.exports = App;


},{"./components/x_pane_component":1,"./components/x_tabs_component":2,"./config/app":3,"./config/routes":4,"./controllers/account_controller":5,"./controllers/application_controller":6,"./controllers/apply_coupon_controller":7,"./controllers/cancel_form_controller":8,"./controllers/coupon_controller":9,"./controllers/credit_card_form_controller":10,"./controllers/history_controller":11,"./controllers/purchase_form_controller":12,"./controllers/update_card_controller":13,"./helpers/stripe":14,"./models/org":16,"./models/user":17,"./routes/application_route":18,"./routes/index_route":19,"./routes/loading_route":20,"./routes/profile_route":21,"./templates":22,"./views/apply_coupon_view":23,"./views/cancel_form_view":24,"./views/loading_view":25,"./views/modal_view":26,"./views/purchase_form_view":27,"./views/update_card_view":28}],16:[function(require,module,exports){
Org = Ember.Object.extend({
  gravatar_url : function() {
    return this.get("avatar_url") 

  }.property("avatar_url"),

  loadDetails : function () {
    var org = this; 
    return Em.Deferred.promise(function(p) {
      p.resolve($.getJSON("/api/profiles/"+ org.get("login")).then(function (response) {
        org.set("details", response)
        return response;
      }));
    });
  },
  loadHistory : function () {
    var org = this; 
    return Em.Deferred.promise(function(p) {
      p.resolve($.getJSON("/api/profiles/"+ org.get("login") + "/history").then(function (response) {
        org.set("history", response)
        return response;
      }));
    });
  }
});

module.exports = Org;

},{}],17:[function(require,module,exports){
User = Ember.Object.extend({
  gravatar_url : function() {
    return this.get("avatar_url")

  }.property("avatar_url"),

  loadDetails : function () {
    var user = this; 
    return Em.Deferred.promise(function(p) {
      p.resolve($.getJSON("/api/profiles/user").then(function (response) {
        user.set("details", response)
        return response;
      }));
    });
  },
  loadHistory : function () {
    var user = this; 
    return Em.Deferred.promise(function(p) {
      p.resolve($.getJSON("/api/profiles/"+ user.get("login") + "/history").then(function (response) {
        user.set("history", response)
        return response;
      }));
    });
  }
});

module.exports = User;

},{}],18:[function(require,module,exports){
var ApplicationRoute = Ember.Route.extend({
  actions: {
    openModal: function (view){
      this.render(view, {
        into: "application",
        outlet: "modal"
      })
    },
    closeModal: function() {
      App.animateModalClose().then(function() {
        this.render('empty', {
          into: 'application',
          outlet: 'modal'
        });
      }.bind(this));
    }
  },

  model : function () {
    return Em.Deferred.promise(function(p) {
      Ember.run.once(function() {
        $.getJSON("/api/profiles").then(function(response) {

          var user = App.User.create(response.user);

          var orgs = Em.A();

          response.orgs.forEach(function(org) {
            orgs.pushObject(App.Org.create(org));
          });

          p.resolve(Ember.Object.create({
            user : user,
            orgs : orgs
          }));


        });
      });
    });
  }
});

module.exports = ApplicationRoute;

},{}],19:[function(require,module,exports){
IndexRoute = Ember.Route.extend({
  model : function () {
    var model = this.modelFor("application");
    return model.user;
  },

  afterModel: function (model) {
    return model.loadDetails().then(function(){
      return model.loadHistory();
    });
  }
});

module.exports = IndexRoute;

},{}],20:[function(require,module,exports){
var LoadingRoute = Ember.Route.extend({
  renderTemplate: function() {
    if(this.router._activeViews.application){
      return this.render({ "into" : "application", "outlet" : "loading"});
    }
    this.render("loading");
  }
});

module.exports = LoadingRoute;

},{}],21:[function(require,module,exports){
ProfileRoute = Ember.Route.extend({
  model: function(params) {

    var profiles = this.modelFor("application");
    return profiles.orgs.find(function(item) {
      return item.login == params.profile_id;                   
    });

  },
  serialize: function (model) {
    return { profile_id: model.get("login")}
  },

  afterModel : function (model) {
    return model.loadDetails().then(function(){
      return model.loadHistory();
    });
  }
});

module.exports = ProfileRoute;

},{}],22:[function(require,module,exports){



},{}],23:[function(require,module,exports){
require("./modal_view")

ApplyCouponView = ModalView.extend({
  processingAction: Ember.computed.alias('controller.processingAction')
});

module.exports = ApplyCouponView;

},{"./modal_view":26}],24:[function(require,module,exports){
require("./modal_view")

CancelFormView = ModalView.extend({
  processingAction: Ember.computed.alias('controller.processingAction')
});

module.exports = CancelFormView;

},{"./modal_view":26}],25:[function(require,module,exports){
require("../../spin.js");

var LoadingView = Ember.View.extend({
  didInsertElement: function(){
     $("body").addClass("fullscreen-open")
     var opts = {
       lines: 13, // The number of lines to draw
       length: 0, // The length of each line
       width: 6, // The line thickness
       radius: 14, // The radius of the inner circle
       corners: 1, // Corner roundness (0..1)
       rotate: 19, // The rotation offset
       direction: 1, // 1: clockwise, -1: counterclockwise
       color: '#4a3e93', // #rgb or #rrggbb or array of colors
       speed: 0.3, // Rounds per second
       trail: 42, // Afterglow percentage
       shadow: false, // Whether to render a shadow
       hwaccel: true, // Whether to use hardware acceleration
       className: 'spinner', // The CSS class to assign to the spinner
       zIndex: 2e9, // The z-index (defaults to 2000000000)
       top: 'auto', // Top position relative to parent in px
       left: 'auto' // Left position relative to parent in px
     };
     new Spinner(opts).spin(this.$().get(0))
     return this._super();
  },
  willDestroyElement: function(){
    $("body").removeClass("fullscreen-open")
    return this._super();
  }
});

module.exports = LoadingView;

},{"../../spin.js":29}],26:[function(require,module,exports){
ModalView = Em.View.extend({
  layout: Em.Handlebars.compile("<div class='fullscreen-overlay fixed'><div class='fullscreen-wrapper'><div class='fullscreen-body credit-card'>{{yield}}</div></div></div>"),

  didInsertElement: function() {
    App.animateModalOpen();

    $('body').on('keyup.modal', function(event) {
      if (event.keyCode === 27) this.get('controller').send('close');
    }.bind(this));
    
    this.$(".fullscreen-body").on('click.modal', function(event){
       event.stopPropagation();    
    }.bind(this))
     
    this.$(".fullscreen-overlay, .close").on('click.modal', function(event){
     this.get('controller').send('close');        
    }.bind(this))
    
   


    this.$(':input:not(.close)').first().focus();
  },

  willDestroyElement: function() {
    $('body').off('keyup.modal');
    this.$(".fullscreen-overlay,.fullscreen-body").off("click.modal");
  }
});

module.exports = ModalView;

},{}],27:[function(require,module,exports){
require("./modal_view")

PurchaseFormView = ModalView.extend({
  processingPurchase: Ember.computed.alias('controller.processingCard')
});

module.exports = PurchaseFormView;

},{"./modal_view":26}],28:[function(require,module,exports){
require("./modal_view")

UpdateCardView = ModalView.extend({
 processingCard: Ember.computed.alias('controller.processingCard')
});

module.exports = UpdateCardView;

},{"./modal_view":26}],29:[function(require,module,exports){
//fgnass.github.com/spin.js#v1.3

/**
 * Copyright (c) 2011-2013 Felix Gnass
 * Licensed under the MIT license
 */
(function(root, factory) {

  /* CommonJS */
  if (typeof exports == 'object')  module.exports = factory()

  /* AMD module */
  else if (typeof define == 'function' && define.amd) define(factory)

  /* Browser global */
  else root.Spinner = factory()
}
(this, function() {
  "use strict";

  var prefixes = ['webkit', 'Moz', 'ms', 'O'] /* Vendor prefixes */
    , animations = {} /* Animation rules keyed by their name */
    , useCssAnimations /* Whether to use CSS animations or setTimeout */

  /**
   * Utility function to create elements. If no tag name is given,
   * a DIV is created. Optionally properties can be passed.
   */
  function createEl(tag, prop) {
    var el = document.createElement(tag || 'div')
      , n

    for(n in prop) el[n] = prop[n]
    return el
  }

  /**
   * Appends children and returns the parent.
   */
  function ins(parent /* child1, child2, ...*/) {
    for (var i=1, n=arguments.length; i<n; i++)
      parent.appendChild(arguments[i])

    return parent
  }

  /**
   * Insert a new stylesheet to hold the @keyframe or VML rules.
   */
  var sheet = (function() {
    var el = createEl('style', {type : 'text/css'})
    ins(document.getElementsByTagName('head')[0], el)
    return el.sheet || el.styleSheet
  }())

  /**
   * Creates an opacity keyframe animation rule and returns its name.
   * Since most mobile Webkits have timing issues with animation-delay,
   * we create separate rules for each line/segment.
   */
  function addAnimation(alpha, trail, i, lines) {
    var name = ['opacity', trail, ~~(alpha*100), i, lines].join('-')
      , start = 0.01 + i/lines * 100
      , z = Math.max(1 - (1-alpha) / trail * (100-start), alpha)
      , prefix = useCssAnimations.substring(0, useCssAnimations.indexOf('Animation')).toLowerCase()
      , pre = prefix && '-' + prefix + '-' || ''

    if (!animations[name]) {
      sheet.insertRule(
        '@' + pre + 'keyframes ' + name + '{' +
        '0%{opacity:' + z + '}' +
        start + '%{opacity:' + alpha + '}' +
        (start+0.01) + '%{opacity:1}' +
        (start+trail) % 100 + '%{opacity:' + alpha + '}' +
        '100%{opacity:' + z + '}' +
        '}', sheet.cssRules.length)

      animations[name] = 1
    }

    return name
  }

  /**
   * Tries various vendor prefixes and returns the first supported property.
   */
  function vendor(el, prop) {
    var s = el.style
      , pp
      , i

    if(s[prop] !== undefined) return prop
    prop = prop.charAt(0).toUpperCase() + prop.slice(1)
    for(i=0; i<prefixes.length; i++) {
      pp = prefixes[i]+prop
      if(s[pp] !== undefined) return pp
    }
  }

  /**
   * Sets multiple style properties at once.
   */
  function css(el, prop) {
    for (var n in prop)
      el.style[vendor(el, n)||n] = prop[n]

    return el
  }

  /**
   * Fills in default values.
   */
  function merge(obj) {
    for (var i=1; i < arguments.length; i++) {
      var def = arguments[i]
      for (var n in def)
        if (obj[n] === undefined) obj[n] = def[n]
    }
    return obj
  }

  /**
   * Returns the absolute page-offset of the given element.
   */
  function pos(el) {
    var o = { x:el.offsetLeft, y:el.offsetTop }
    while((el = el.offsetParent))
      o.x+=el.offsetLeft, o.y+=el.offsetTop

    return o
  }

  // Built-in defaults

  var defaults = {
    lines: 12,            // The number of lines to draw
    length: 7,            // The length of each line
    width: 5,             // The line thickness
    radius: 10,           // The radius of the inner circle
    rotate: 0,            // Rotation offset
    corners: 1,           // Roundness (0..1)
    color: '#000',        // #rgb or #rrggbb
    direction: 1,         // 1: clockwise, -1: counterclockwise
    speed: 1,             // Rounds per second
    trail: 100,           // Afterglow percentage
    opacity: 1/4,         // Opacity of the lines
    fps: 20,              // Frames per second when using setTimeout()
    zIndex: 2e9,          // Use a high z-index by default
    className: 'spinner', // CSS class to assign to the element
    top: 'auto',          // center vertically
    left: 'auto',         // center horizontally
    position: 'relative'  // element position
  }

  /** The constructor */
  function Spinner(o) {
    if (typeof this == 'undefined') return new Spinner(o)
    this.opts = merge(o || {}, Spinner.defaults, defaults)
  }

  // Global defaults that override the built-ins:
  Spinner.defaults = {}

  merge(Spinner.prototype, {

    /**
     * Adds the spinner to the given target element. If this instance is already
     * spinning, it is automatically removed from its previous target b calling
     * stop() internally.
     */
    spin: function(target) {
      this.stop()

      var self = this
        , o = self.opts
        , el = self.el = css(createEl(0, {className: o.className}), {position: o.position, width: 0, zIndex: o.zIndex})
        , mid = o.radius+o.length+o.width
        , ep // element position
        , tp // target position

      if (target) {
        target.insertBefore(el, target.firstChild||null)
        tp = pos(target)
        ep = pos(el)
        css(el, {
          left: (o.left == 'auto' ? tp.x-ep.x + (target.offsetWidth >> 1) : parseInt(o.left, 10) + mid) + 'px',
          top: (o.top == 'auto' ? tp.y-ep.y + (target.offsetHeight >> 1) : parseInt(o.top, 10) + mid)  + 'px'
        })
      }

      el.setAttribute('role', 'progressbar')
      self.lines(el, self.opts)

      if (!useCssAnimations) {
        // No CSS animation support, use setTimeout() instead
        var i = 0
          , start = (o.lines - 1) * (1 - o.direction) / 2
          , alpha
          , fps = o.fps
          , f = fps/o.speed
          , ostep = (1-o.opacity) / (f*o.trail / 100)
          , astep = f/o.lines

        ;(function anim() {
          i++;
          for (var j = 0; j < o.lines; j++) {
            alpha = Math.max(1 - (i + (o.lines - j) * astep) % f * ostep, o.opacity)

            self.opacity(el, j * o.direction + start, alpha, o)
          }
          self.timeout = self.el && setTimeout(anim, ~~(1000/fps))
        })()
      }
      return self
    },

    /**
     * Stops and removes the Spinner.
     */
    stop: function() {
      var el = this.el
      if (el) {
        clearTimeout(this.timeout)
        if (el.parentNode) el.parentNode.removeChild(el)
        this.el = undefined
      }
      return this
    },

    /**
     * Internal method that draws the individual lines. Will be overwritten
     * in VML fallback mode below.
     */
    lines: function(el, o) {
      var i = 0
        , start = (o.lines - 1) * (1 - o.direction) / 2
        , seg

      function fill(color, shadow) {
        return css(createEl(), {
          position: 'absolute',
          width: (o.length+o.width) + 'px',
          height: o.width + 'px',
          background: color,
          boxShadow: shadow,
          transformOrigin: 'left',
          transform: 'rotate(' + ~~(360/o.lines*i+o.rotate) + 'deg) translate(' + o.radius+'px' +',0)',
          borderRadius: (o.corners * o.width>>1) + 'px'
        })
      }

      for (; i < o.lines; i++) {
        seg = css(createEl(), {
          position: 'absolute',
          top: 1+~(o.width/2) + 'px',
          transform: o.hwaccel ? 'translate3d(0,0,0)' : '',
          opacity: o.opacity,
          animation: useCssAnimations && addAnimation(o.opacity, o.trail, start + i * o.direction, o.lines) + ' ' + 1/o.speed + 's linear infinite'
        })

        if (o.shadow) ins(seg, css(fill('#000', '0 0 4px ' + '#000'), {top: 2+'px'}))

        ins(el, ins(seg, fill(o.color, '0 0 1px rgba(0,0,0,.1)')))
      }
      return el
    },

    /**
     * Internal method that adjusts the opacity of a single line.
     * Will be overwritten in VML fallback mode below.
     */
    opacity: function(el, i, val) {
      if (i < el.childNodes.length) el.childNodes[i].style.opacity = val
    }

  })


  function initVML() {

    /* Utility function to create a VML tag */
    function vml(tag, attr) {
      return createEl('<' + tag + ' xmlns="urn:schemas-microsoft.com:vml" class="spin-vml">', attr)
    }

    // No CSS transforms but VML support, add a CSS rule for VML elements:
    sheet.addRule('.spin-vml', 'behavior:url(#default#VML)')

    Spinner.prototype.lines = function(el, o) {
      var r = o.length+o.width
        , s = 2*r

      function grp() {
        return css(
          vml('group', {
            coordsize: s + ' ' + s,
            coordorigin: -r + ' ' + -r
          }),
          { width: s, height: s }
        )
      }

      var margin = -(o.width+o.length)*2 + 'px'
        , g = css(grp(), {position: 'absolute', top: margin, left: margin})
        , i

      function seg(i, dx, filter) {
        ins(g,
          ins(css(grp(), {rotation: 360 / o.lines * i + 'deg', left: ~~dx}),
            ins(css(vml('roundrect', {arcsize: o.corners}), {
                width: r,
                height: o.width,
                left: o.radius,
                top: -o.width>>1,
                filter: filter
              }),
              vml('fill', {color: o.color, opacity: o.opacity}),
              vml('stroke', {opacity: 0}) // transparent stroke to fix color bleeding upon opacity change
            )
          )
        )
      }

      if (o.shadow)
        for (i = 1; i <= o.lines; i++)
          seg(i, -2, 'progid:DXImageTransform.Microsoft.Blur(pixelradius=2,makeshadow=1,shadowopacity=.3)')

      for (i = 1; i <= o.lines; i++) seg(i)
      return ins(el, g)
    }

    Spinner.prototype.opacity = function(el, i, val, o) {
      var c = el.firstChild
      o = o.shadow && o.lines || 0
      if (c && i+o < c.childNodes.length) {
        c = c.childNodes[i+o]; c = c && c.firstChild; c = c && c.firstChild
        if (c) c.opacity = val
      }
    }
  }

  var probe = css(createEl('group'), {behavior: 'url(#default#VML)'})

  if (!vendor(probe, 'transform') && probe.adj) initVML()
  else useCssAnimations = vendor(probe, 'animation')

  return Spinner

}));

},{}]},{},[15])
;