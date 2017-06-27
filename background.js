chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {

    chrome.storage.sync.get({
        server: '',
        projectId: null,
        issueTypeId: null
    }, function(data) {
        var server = data.server;

        if (!(server && data.projectId && data.issueTypeId)) {
            chrome.runtime.openOptionsPage();
            return sendResponse(JSON.stringify({
                error: 'Server not defined',
                showSettings: true
            }));
        }

        server = server.replace(/\/$/, "");

        var xhr = new XMLHttpRequest();

        xhr.open('POST',server + '/rest/api/2/issue/', true);
        xhr.setRequestHeader('Content-Type', 'application/json');

        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status == 201) {
                    var data = JSON.parse(xhr.responseText);
                    data["meta"] = {
                        server: server,
                        projectId: data.projectId,
                        issueTypeId: data.issueTypeId
                    };

                    sendResponse(JSON.stringify(data));
                    
                    if (request.screenshot) {
                        attachScreenshot(data.key);
                    }

                    if (request.har) {
                        attachHar(data.key);
                    }
                    
                } else {
                    sendResponse(JSON.stringify({
                        error: xhr.responseText || xhr.status || true
                    }));
                }
            }
        };

        var fields = {
            project: {
                key: data.projectId
            },
            summary: request.summary,
            description: request.description,
            issuetype: {
                id: data.issueTypeId
            }
        };

        var component = request.component;
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

        function attachScreenshot(issueId) {
            attachData(base64toBlob(request.screenshot.replace(/^data.*?,\s*/i, ""), "image/png"), "screenshot.png", issueId);
        }

        function attachHar(issueId) {

            var xhr = new XMLHttpRequest();
            xhr.open("GET", request.har, true);
            xhr.responseType = "arraybuffer";

            xhr.onload = function() {
                attachData(new Blob([xhr.response], {
                    type: "application/octet-stream"
                }), "requests.har", issueId);
            };

            xhr.send();

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

