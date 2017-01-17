/*!
 *
 *  Web Starter Kit
 *  Copyright 2015 Google Inc. All rights reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License
 *
 */
/* eslint-env browser */
(function() {
  'use strict';

  var hostname = window.location.hostname;
  // Check to make sure service workers are supported in the current browser,
  // and that the current page is accessed from a secure origin. Using a
  // service worker from an insecure origin will trigger JS console errors. See
  // http://www.chromium.org/Home/chromium-security/prefer-secure-origins-for-powerful-new-features
  var isLocalhost = Boolean(hostname === 'localhost' ||
      // [::1] is the IPv6 localhost address.
      hostname === '[::1]' ||
      // 127.0.0.1/8 is considered localhost for IPv4.
      hostname.match(
        /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
      )
    );

  if ('serviceWorker' in navigator &&
      (window.location.protocol === 'https:' || isLocalhost)) {
    navigator.serviceWorker.register('service-worker.js')
    .then(function(registration) {
      // updatefound is fired if service-worker.js changes.
      registration.onupdatefound = function() {
        // updatefound is also fired the very first time the SW is installed,
        // and there's no need to prompt for a reload at that point.
        // So check here to see if the page is already controlled,
        // i.e. whether there's an existing service worker.
        if (navigator.serviceWorker.controller) {
          // The updatefound event implies that registration.installing is set:
          // https://slightlyoff.github.io/ServiceWorker/spec/service_worker/index.html#service-worker-container-updatefound-event
          var installingWorker = registration.installing;

          installingWorker.onstatechange = function() {
            switch (installingWorker.state) {
              case 'installed':
                // At this point, the old content will have been purged and the
                // fresh content will have been added to the cache.
                // It's the perfect time to display a "New content is
                // available; please refresh." message in the page's interface.
                break;

              case 'redundant':
                throw new Error('The installing ' +
                                'service worker became redundant.');

              default:
                // Ignore
            }
          };
        }
      };
    }).catch(function(e) {
      console.error('Error during service worker registration:', e);
    });
  }

  var storedArticleKey = window.location.href;
  var article;
  // Calculate file name based on the current path.
  var path = window.location.pathname;
  if (path.indexOf('edit.html') !== -1) {
    path = path.substring(0, path.length - 'edit.html'.length);
  }
  var endsWithSlash = path[path.length - 1] === '/';
  var namePrefix = endsWithSlash ? '' : '/';
  var filename = path[0] === '/' ? path.substring(1) : path;
  var outputFilename = filename + namePrefix + 'index.html';
  var editFilename = filename + namePrefix + 'edit.html';

  if (filename.indexOf('.app/') !== -1) {
    window.alert('Wrong path. Cannot write things inside .app/ direcotry');
    throw new Error('Wrong path. Cannot write things inside .app/ direcotry');
  }

  var currentlyEditing = window['CURRENTLY_EDITING_ARTICLE'] || null;
  // Load currently being edited article, if nothing is currently being edited,
  // load the stored article draft otherwise just initialize the placeholder article
  // to create new page. CURRENTLY_EDITING_ARTICLE is set when loading the edit.html
  // on any path.
  var storedArticleDraft = localStorage.getItem(storedArticleKey);
  if (currentlyEditing || storedArticleDraft) {
    try {
      article = carbon.Article.fromJSON(JSON.parse(currentlyEditing || storedArticleDraft));
    } catch (e) {
      console.error('Error with the loading saved article.' +
          'This is probably due to backward-incompatability.');
    }
  } else {
    article = new carbon.Article({
      sections: [new carbon.Section({
        components: [
          new carbon.Layout({
            components: [
              new carbon.Paragraph({
                placeholderText: 'This page does not exist',
                paragraphType: carbon.Paragraph.Types.MainHeader
              }),
              new carbon.Paragraph({
                placeholderText: 'You can create it by editing this.',
                paragraphType: carbon.Paragraph.Types.ThirdHeader
              }),
              new carbon.Paragraph({
                placeholderText: 'Remember you can always publish this page by typing +publish on a new line and hitting enter.'
              }),
            ]
          })
        ]
      })]
    });
  }

  var el = document.getElementById('editor');
  var editor = new carbon.Editor(el, {
    article: article,
    modules: [
      carbon.EmbeddedComponent,
    ],
  });

  editor.install(carbon.EmbeddingExtension, {
    embedProviders: {
      embedly: new carbon.EmbedlyProvider({
        apiKey: '46c6ad376b1343359d774c5d8a940db7'
      }),
      carbon: new carbon.CarbonEmbedProvider({
      })
    },
    ComponentClass: carbon.EmbeddedComponent
  });
  editor.install(carbon.GiphySearch, {
    apiKey: 'dc6zaTOxFJmzC'
  });
  editor.install(carbon.LayoutingExtension);
  var uploadManager = new carbon.UploadManager(editor, {
    uploaders: [new carbon.CarbonUpUploader({})]
  });
  editor.install(carbon.SelfieExtension, {
    uploadManager: uploadManager,
  });
  editor.install(carbon.FilePicker, {
    uploadManager: uploadManager,
  });
  editor.install(carbon.DragDropFiles, {
    uploadManager: uploadManager,
  });

  editor.render();

  GCS.init({
    // Not currently used in the demo.
    clientId: '950846180877-cqmh4098gben0k46d740ibdvrp46cf14.apps.googleusercontent.com',
    bucket: hostname,
    project: 'carbon-tools',
    group: '',
    apiKey: 'AIzaSyCpljzMLrPLdvogyttH-QCyzl0X5eDnIeg'
  });

  editor.addEventListener('change', function() {
    var json = article.getJSONModel();
    localStorage.setItem(storedArticleKey, JSON.stringify(json));
  });

  // Register a Regex to trigger publishing the article.
  editor.registerRegex('^\\+publish$', function(matchedComponent, opsCallback) {
    // Delete the paragraph.
    var atIndex = matchedComponent.getIndexInSection();
    opsCallback(matchedComponent.getDeleteOps(atIndex));

    // Carbon HTML needs to strip out contenteditable attribute.
    // Upload rendered HTML view.
    var html = editor.getHTML().replace(/contenteditable/ig, '');
    var outputFile = new Blob([renderTemplate('output.html', {'OUTPUT': html})], {
      type: 'text/html',
      name: outputFilename,
    });
    outputFile.name = outputFilename;
    GCS.insertObject(outputFile, function(resp) {
      console.log('Published Output View to: https://%s/%s/', hostname, outputFilename);
      uploadedPage();
    });

    // Upload edit view.
    var json = article.getJSONModel();
    var editTemplate = renderTemplate('edit.html', {
      'MODEL': escapeQuotes(JSON.stringify(json))
    });
    var editFile = new Blob([editTemplate], {
      type: 'text/html',
      name: editFilename,
    });
    editFile.name = editFilename;

    GCS.insertObject(editFile, function(resp) {
      console.log('Published Edit View to: https://%s/%s/', hostname, editFilename);
      uploadedPage();
    });
  });

  var publishedPages = 0;
  function uploadedPage() {
    publishedPages++;
    if (publishedPages < 2) {
      return;
    }
    window.alert('Successfully published page. Reloading page. Remember you can edit a page by going to ' + editFilename);
    window.location.reload();
  }

  editor.addEventListener('attachment-added', function(event){
    var attachment = event.detail.attachment;
    var file = attachment.file;
    var config = {};
    if (!file && attachment.dataUri) {
      var dataUri = attachment.dataUri;
      var timestamp = (new Date()).getTime();
      var name = 'selfie-' + timestamp;
      var imageFormat = '';
      var match = dataUri.match(/^data\:image\/(\w+)/);
      if (match) {
        imageFormat = match[1];
      } else {
        throw new Error('Cannot locate image format in Data URI');
      }

      var uploadName = 'uploads/selfies/' + name + '.jpg';
      // extract raw base64 data from Data URI
      var rawImageData = dataUri.replace(
          /^data\:image\/\w+\;base64\,/, '');
      file = new Blob(
          [Webcam.base64DecToArr(rawImageData)],
          {type: 'image/' + imageFormat, name: uploadName});
      file.name = uploadName;
    }
    config['name'] = uploadName;

    GCS.insertObject(file, function(resp) {
      attachment.setAttributes({src: resp.mediaLink});
      editor.dispatchEvent(new Event('change'));
    }, config);
  });

  function escapeQuotes(str) {
    return str.replace(/'/gi, '\\\'').replace(/"/gi, '\\\"');
  }

  function renderTemplate(templateName, data) {
    var templateStr = window.TEMPLATES[templateName];
    for (var key in data) {
      // Replace occurances of %%%KEY%%% with the data.
      templateStr = templateStr.split('%%%' + key + '%%%').join(data[key]);
    }
    return templateStr;
  }
})();

