function getSelectedFile() {
  const filePicker = document.getElementById("SelfieInput");

  if (!filePicker || !filePicker.files || filePicker.files.length <= 0)
    return false;

  const file = filePicker.files[0];

  // Input field should limit this anyway but w/e
  if (!["image/gif", "image/jpeg", "image/png"].includes(file.type)) {
    alert("Bad image file, please input a png, jpeg or gif");
  }

  // Doing this on the client, but let's not make someone's phone try to write a 50MB PDF...
  if (file.size > 50 * 1024 * 1024) {
    alert("Image is too large (max 50 MB)");
    return null;
  }

  return file;
}

function createPdf(imageDataURL) {
  const docDefinition = {
    pageSize: "A5",
    pageOrientation: "landscape",
    content: [
      {
        columns: [
          {
            image: imageDataURL,
            width: 150,
            height: 150,
          },
          [
            {
              text: userData.name,
              fontSize: 32,
            },
            {
              text: userData.role,
              fontSize: 22,
            },
            {
              text: userData.bio,
              fontSize: 14,
            },
          ],
        ],
      },
    ],
  };

  pdfMake.createPdf(docDefinition).download();

  // TODO: if successful tell the API. if stuff on the client fails I gotta know
}

function onSubmit() {
  const file = getSelectedFile();
  const reader = new FileReader();
  reader.addEventListener("load", () => createPdf(reader.result));
  reader.addEventListener("error", () => alert("Failed to read image file!"));
  reader.readAsDataURL(file);
}

function onFileSelect() {
  const file = getSelectedFile();
  const shouldDisableButton = !file;

  const entryButton = document.getElementById("EntryButton");
  entryButton.disabled = shouldDisableButton;
}
