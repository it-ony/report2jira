chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {

    chrome.storage.sync.get({
        server: '',
        projectId: null,
        issueTypeId: null
    }, function(configuration) {
        let server = configuration.server;

        if (!(server && configuration.projectId && configuration.issueTypeId)) {
            chrome.runtime.openOptionsPage();
            return sendResponse(JSON.stringify({
                error: 'Server not defined',
                showSettings: true
            }));
        }

        server = server.replace(/\/$/, "");

        const method = {
            getTicket: function(parameter) {

                const jql = 'summary ~ "\\"' + parameter.summary + '\\""';

                fetch(server + '/rest/api/2/search?jql=' + jql + '&maxResults=1', {
                    credentials: 'include'
                })
                .then(response => response.json())
                .then(json => {
                    debugger;

                    if (json.total >= 1) {
                        sendResponse({
                            meta: {
                                server: server,
                                issue: json.issues[0].key
                            }
                        });
                    } else {
                        sendResponse({
                            meta: {
                                server: server,
                                issue: undefined
                            }
                        });
                    }
                })
                .catch(err => {
                    sendResponse(JSON.stringify({
                        error: err
                    }))
                });

            },
            createIssue: function(parameter) {

                var xhr = new XMLHttpRequest();

                xhr.open('POST', server + '/rest/api/2/issue/', true);
                xhr.setRequestHeader('Content-Type', 'application/json');

                xhr.onreadystatechange = function() {
                    if (xhr.readyState === 4) {
                        if (xhr.status === 201) {
                            var jiraData = JSON.parse(xhr.responseText);
                            jiraData["meta"] = {
                                server: server,
                                projectId: jiraData.projectId,
                                issueTypeId: jiraData.issueTypeId
                            };

                            sendResponse(jiraData);

                            if (parameter.screenshot) {
                                attachScreenshot(jiraData.key, parameter.screenshot);
                            }

                            if (parameter.har) {
                                attachHar(jiraData.key, parameter.har);
                            }

                        } else {
                            sendResponse({
                                error: xhr.responseText || xhr.status || true
                            });
                        }
                    }
                };

                const fields = {
                    project: {
                        key: configuration.projectId
                    },
                    summary: parameter.summary,
                    description: parameter.description,
                    issuetype: {
                        id: configuration.issueTypeId
                    }
                };

                const component = parameter.component;
                if (component) {
                    fields.components = [{
                        name: component
                    }];
                }

                xhr.send(JSON.stringify({
                    fields: fields
                }));


                function attachData(blob, fileName, issueId) {

                    var xhr = new XMLHttpRequest();
                    xhr.open('POST', server + '/rest/api/2/issue/' + issueId + '/attachments', true);
                    xhr.setRequestHeader('X-Atlassian-Token', 'nocheck');

                    var formData = new FormData();
                    formData.append("file", blob, fileName);

                    xhr.send(formData);
                }

                function attachScreenshot(issueId, screenshot) {
                    attachData(base64toBlob(screenshot.replace(/^data.*?,\s*/i, ""), "image/png"), "screenshot.png", issueId);
                }

                function attachHar(issueId, harFile) {

                    var xhr = new XMLHttpRequest();
                    xhr.open("GET", harFile, true);
                    xhr.responseType = "arraybuffer";

                    xhr.onload = function() {
                        attachData(new Blob([xhr.response], {
                            type: "application/octet-stream"
                        }), "requests.har", issueId);
                    };

                    xhr.send();

                }


            }
        }[request.method];

        if (method) {
            method(request.data);
        } else {
            return sendResponse({
                error: 'Method "' + method +  '" not found.'
            });
        }

    });

    function base64toBlob(base64Data, contentType) {
        contentType = contentType || '';
        var sliceSize = 1024;
        var byteCharacters = atob(base64Data);
        var bytesLength = byteCharacters.length;
        var slicesCount = Math.ceil(bytesLength / sliceSize);
        var byteArrays = new Array(slicesCount);

        for (var sliceIndex = 0; sliceIndex < slicesCount; ++sliceIndex) {
            var begin = sliceIndex * sliceSize;
            var end = Math.min(begin + sliceSize, bytesLength);

            var bytes = new Array(end - begin);
            for (var offset = begin, i = 0; offset < end; ++i, ++offset) {
                bytes[i] = byteCharacters[offset].charCodeAt(0);
            }
            byteArrays[sliceIndex] = new Uint8Array(bytes);
        }
        return new Blob(byteArrays, {type: contentType});
    }



    return true;

});

