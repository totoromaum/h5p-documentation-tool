var H5P = H5P || {};

/**
 * Documentation tool module
 * @external {jQuery} $ H5P.jQuery
 */
H5P.DocumentationTool = (function ($, NavigationMenu) {
  // CSS Classes:
  var MAIN_CONTAINER = 'h5p-documentation-tool';
  var PAGES_CONTAINER = 'h5p-documentation-tool-page-container';
  var PAGE_INSTANCE = 'h5p-documentation-tool-page';
  var FOOTER = 'h5p-documentation-tool-footer';

  /**
   * Initialize module.
   * @param {Object} params Behavior settings
   * @param {Number} id Content identification
   * @returns {Object} DocumentationTool DocumentationTool instance
   */
  function DocumentationTool(params, id) {
    this.$ = $(this);
    this.id = id;

    // Set default behavior.
    this.params = $.extend({}, {
      taskDescription: 'Documentation Tool',
      navMenuLabel: "Documentation Tool",
      pagesList: []
    }, params);
  }

  /**
   * Attach function called by H5P framework to insert H5P content into page.
   *
   * @param {jQuery} $container The container which will be appended to.
   */
  DocumentationTool.prototype.attach = function ($container) {
    var self = this;
    this.pageInstances = [];
    this.currentPageIndex = 0;

    this.$inner = $container.addClass(MAIN_CONTAINER);

    this.$mainContent = $('<div/>', {
      'class': 'h5p-documentation-tool-main-content'
    }).appendTo(this.$inner);

    // Create pages
    var $pagesContainer = self.createPages().appendTo(this.$mainContent);
    self.$pagesArray = $pagesContainer.children();

    // Create navigation menu
    var navigationMenu = new NavigationMenu(self, this.params.navMenuLabel);
    navigationMenu.attach(this.$mainContent);

    if (this.$inner.children().length) {
      self.$pagesArray.eq(self.currentPageIndex).addClass('current');
    }

    self.resize();
  };

  /**
   * Creates the footer.
   * @returns {jQuery} $footer Footer element
   */
  DocumentationTool.prototype.createFooter = function () {
    var $footer = $('<div>', {
      'class': FOOTER
    });

    // Next page button
    this.createNavigationButton(1)
      .appendTo($footer);

    // Previous page button
    this.createNavigationButton(-1)
      .appendTo($footer);

    return $footer;
  };

  /**
   * Create navigation button
   * @param {Number} moveDirection An integer for how many pages the button will move, and in which direction
   * @returns {*}
   */
  DocumentationTool.prototype.createNavigationButton = function (moveDirection) {
    var self = this;
    var navigationText = 'next';
    if (moveDirection === -1) {
      navigationText = 'prev';
    }
    var $navButton = $('<div>', {
      'class': 'h5p-navigation-button-' + navigationText,
      'role': 'button',
      'tabindex': '1'
    }).click(function () {
      self.movePage(self.currentPageIndex + moveDirection);
    }).keydown(function (e) {
      var keyPressed = e.which;
      // 32 - space
      if (keyPressed === 32) {
        $(this).click();
        e.preventDefault();
      }
      $(this).focus();
    });

    return $navButton;
  };

  /**
   * Populate container and array with page instances.
   * @returns {jQuery} Container
   */
  DocumentationTool.prototype.createPages = function () {
    var self = this;

    var $pagesContainer = $('<div>', {
      'class': PAGES_CONTAINER
    });

    this.params.pagesList.forEach(function (page) {
      var $pageInstance = $('<div>', {
        'class': PAGE_INSTANCE
      }).appendTo($pagesContainer);

      var singlePage = H5P.newRunnable(page, self.id);
      if (singlePage instanceof H5P.DocumentExportPage) {
        singlePage.setTitle(self.params.taskDescription);
      }
      singlePage.attach($pageInstance);
      self.createFooter().appendTo($pageInstance);
      self.pageInstances.push(singlePage);
    });

    return $pagesContainer;
  };

  /**
   * Moves the documentation tool to the specified page
   * @param {Number} toPage Move to this page index
   */
  DocumentationTool.prototype.movePage = function (toPage) {
    var self = this;

    var assessmentGoals = self.getGoalAssessments(self.pageInstances);
    var newGoals = self.getGoals(self.pageInstances);
    assessmentGoals.forEach(function (assessmentPage) {
      newGoals = self.mergeGoals(newGoals, assessmentPage);
    });
    self.setGoals(self.pageInstances, newGoals);

    var allInputs = self.getDocumentExportInputs(self.pageInstances);
    this.setDocumentExportOutputs(self.pageInstances, allInputs);
    // Invalid value
    if ((toPage + 1 > this.$pagesArray.length) || (toPage < 0)) {
      throw new Error('invalid parameter for movePage(): ' + toPage);
    }

    this.$pagesArray.eq(this.currentPageIndex).removeClass('current');
    this.currentPageIndex = toPage;
    this.$pagesArray.eq(this.currentPageIndex).addClass('current');
  };

  /**
   * Merge assessment goals and newly created goals
   *
   * @returns {Array} newGoals Merged goals list with updated assessments
   */
  DocumentationTool.prototype.mergeGoals = function (newGoals, assessmentGoals) {
    // Not an assessment page
    if (!assessmentGoals.length) {
      return newGoals;
    }
    newGoals.forEach(function (goalPage, pageIndex) {
      goalPage.forEach(function (goalInstance) {
        var result = $.grep(assessmentGoals[pageIndex], function (assessmentInstance) {
          return assessmentInstance.goalId() === goalInstance.goalId();
        });
        if (result.length) {
          goalInstance.goalAnswer(result[0].goalAnswer());
        }
      });
    });
    return newGoals;
  };

  /**
   * Gets goals assessments from all goals assessment pages and returns update goals list.
   *
   * @param {Array} pageInstances Array of pages contained within the documentation tool
   * @returns {Array} goals Updated goals list
   */
  DocumentationTool.prototype.getGoalAssessments = function (pageInstances) {
    var goals = [];
    pageInstances.forEach(function (page) {
      var targetGoals = [];
      if (page instanceof H5P.GoalsAssessmentPage) {
        targetGoals = page.getAssessedGoals();
      }
      goals.push(targetGoals);
    });
    return goals;
  };

  /**
   * Retrieves all input fields from the documentation tool
   * @returns {Array} inputArray Array containing all inputs of the documentation tool
   */
  DocumentationTool.prototype.getDocumentExportInputs = function (pageInstances) {
    var inputArray = [];
    pageInstances.forEach(function (page) {
      var pageInstanceInput = [];
      if (page instanceof H5P.StandardPage) {
        pageInstanceInput = page.getInputArray();
      }
      inputArray.push(pageInstanceInput);
    });

    return inputArray;
  };

  /**
   * Gets goals from all goal pages and returns updated goals list.
   *
   * @param {Array} pageInstances Array containing all pages.
   * @returns {Array} goals Updated goals list.
   */
  DocumentationTool.prototype.getGoals = function (pageInstances) {
    var goals = [];
    pageInstances.forEach(function (page) {
      var targetGoals = [];
      if (page instanceof H5P.GoalsPage) {
        targetGoals = page.getGoals();
      }
      goals.push(targetGoals);
    });
    return goals;
  };

  /**
   * Insert goals to all goal assessment pages.
   * @param {Array} pageInstances Page instances
   * @param {Array} goals Array of goals.
   */
  DocumentationTool.prototype.setGoals = function (pageInstances, goals) {
    pageInstances.forEach(function (page) {
      if (page instanceof H5P.GoalsAssessmentPage) {
        page.updateAssessmentGoals(goals);
      }
    });
  };

  /**
   * Sets the output for all document export pages
   * @param {Array} inputs Array of input strings
   */
  DocumentationTool.prototype.setDocumentExportOutputs  = function (pageInstances, inputs) {
    pageInstances.forEach(function (page) {
      if (page instanceof H5P.DocumentExportPage) {
        page.updateOutputFields(inputs);
      }
    });
  };

  /**
   * Resize function for responsiveness.
   */
  DocumentationTool.prototype.resize = function () {
    // Static padding at bottom of the page
    var staticPadding = 10;
    // Minimum height of documentation tool
    var neededHeight = 300;
    // Get initial height for all pages.
    this.$mainContent.css('height', 'initial');
    this.$pagesArray.each(function () {
      var pageInitialHeight = $(this).height();
      if (pageInitialHeight + staticPadding > neededHeight) {
        neededHeight = pageInitialHeight + staticPadding;
      }
    });
    this.$mainContent.css('height', neededHeight + 'px');
  };

  return DocumentationTool;
}(H5P.jQuery, H5P.DocumentationTool.NavigationMenu));
