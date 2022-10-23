const UserTypes = {
  Auth: 1,
  Subject: 2,
};

function getSelectedFile() {
  const filePicker = document.getElementById("SelfieInput");

  if (!filePicker || !filePicker.files || filePicker.files.length <= 0)
    return false;

  const file = filePicker.files[0];

  // Input field should limit this anyway but w/e
  if (!["image/jpeg", "image/png"].includes(file.type)) {
    alert("Bad image file, please input a png, jpeg or gif");
  }

  // Doing this on the client, but let's not make someone's phone try to write a 50MB PDF...
  if (file.size > 50 * 1024 * 1024) {
    alert("Image is too large (max 50 MB)");
    return null;
  }

  return file;
}

const loadFont = (url) =>
  new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.responseType = "arraybuffer";
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4 && xhr.status === 200) {
        resolve(xhr.response);
      }
    };
    xhr.send();
  });

/**
 * @param {ArrayBuffer} imageArrayBuffer
 * @param {string} type
 * @returns {Promise<void>}
 */
async function createPdf(imageArrayBuffer, imageMimeType) {
  try {
    const statusData = {};

    const url = `/pdf/${userType === UserTypes.Auth ? "auth" : "subj"}.pdf`;
    const pdfArrayBuffer = await fetch(url).then((res) => res.arrayBuffer());
    const pdfDoc = await PDFLib.PDFDocument.load(pdfArrayBuffer);
    const page = pdfDoc.getPages()[0];

    pdfDoc.registerFontkit(fontkit);

    const fontBytes = await loadFont("/fonts/SyneMono-Regular.ttf");
    const font = await pdfDoc.embedFont(fontBytes);
    const fontOpacity = 0.9;
    // const fontBoldBytes = await loadFont("/fonts/SyneMono-Regular.ttf");
    // const fontBold = await pdfDoc.embedFont(fontBoldBytes);

    page.setFont(font);
    page.setFontColor(PDFLib.rgb(1, 1, 1));

    // Sleepy 1am maths, this is probably wrong...
    const dynamicSize = (string, maxChars, idealSize) => {
      if (!string) return idealSize;

      const chars = string.length;
      const minSize = idealSize / 2;
      const charScaleCutoff = maxChars * 1.5;

      // This should usually be the case.
      if (chars <= maxChars) return idealSize;

      // We want to shrink by half at most, if a string is greater than double the max length.
      // If it exceeds by that much, we're done a dumb bio string or something.
      if (chars > charScaleCutoff) return minSize;

      // Try to find a reasonable value in the range with a lerp.
      // y1 = maxChars * some factor, y0 = maxChars, x1 = idealSize, x2 = idealSize * some factor
      return Math.floor(
        idealSize -
          minSize * ((chars - maxChars) / (charScaleCutoff - maxChars))
      );
    };
    page.drawText(userData.name.toUpperCase(), {
      x: 400,
      y: 959,
      size: dynamicSize(userData.name, 25, 28),
    });

    const dobDate = new Date(userData.dob);
    const dob = [
      dobDate.getDay() || Math.floor(Math.random() * 27) + 1,
      dobDate.getMonth() || Math.floor(Math.random() * 11) + 1, // why the FUCK is getMonth() sometimes 0?
      dobDate.getFullYear(),
    ].join("/");

    page.drawText(dob, {
      x: 400,
      y: 879,
      size: 28,
      opacity: fontOpacity,
    });

    page.drawText(userData.birthplace, {
      x: 400,
      y: 799,
      opacity: fontOpacity,
      size: dynamicSize(userData.birthplace, 26, 28),
    });

    page.drawText(userData.occupation, {
      x: 400,
      y: 718,
      opacity: fontOpacity,
      size: dynamicSize(userData.occupation, 26, 28),
    });

    page.drawText(userData.bio, {
      x: 110,
      y: 430,
      opacity: fontOpacity,
      size: dynamicSize(userData.bio, 420, 24),
      maxWidth: 610,
      font: font,
    });

    // Safari seems to be rotating images for some reason. Try to detect it, and if it seems rotated, rotate it back.
    let shouldRotate = false;
    const agent = navigator.userAgent;
    statusData.agent = agent;
    if (
      agent &&
      agent.indexOf("Safari") > -1 &&
      !(agent.indexOf("Chrome") > -1)
    ) {
      await new Promise((resolve, _reject) => {
        const imgBlob = new Blob([imageArrayBuffer], { type: imageMimeType });
        const img = new Image();
        img.src = URL.createObjectURL(imgBlob);
        const timeoutID = setTimeout(() => resolve(), 1000);
        img.onload = function () {
          statusData.imgWidth = img.width;
          statusData.imgHeight = img.height;
          if (img.width < img.height) shouldRotate = true;
          URL.revokeObjectURL(img.src);
          clearTimeout(timeoutID);
          resolve();
        };
      });
    }

    statusData.shouldRotate = shouldRotate;
    statusData.imageType = imageMimeType;

    let image;
    if (imageMimeType === "image/jpeg") {
      image = await pdfDoc.embedJpg(imageArrayBuffer);
    } else if (imageMimeType === "image/png") {
      image = await pdfDoc.embedPng(imageArrayBuffer);
    } else {
      console.error("Bad file type!");
      alert(
        "The image file could not be recognised as a PNG or JPEG. Please try again with a valid PNG or JPEG image."
      );
    }

    const imgOpts = {
      width: 240,
      height: 240,
      opacity: 0.8,
    };

    if (shouldRotate)
      page.drawImage(image, {
        ...imgOpts,
        x: 100,
        y: 980,
        rotate: PDFLib.degrees(-90),
      });
    else
      page.drawImage(image, {
        ...imgOpts,
        x: 100,
        y: 740,
      });

    const pdfDataUri = await pdfDoc.saveAsBase64({dataUri: true});
    document.getElementById("pdf").src = pdfDataUri;
    document.getElementById("wrapper").classList.add('entry-wrapper--show-pdf');
    
    const blob = new Blob([await pdfDoc.save()]);
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);

    const typeString = userType === UserTypes.Auth ? "Auth" : "Subject";
    const nameString = userData.name.replace(" ", "");
    link.download = `Order_ID_${typeString}_${nameString}.pdf`;

    document.body.append(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(link.href), 10000);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/submit", true);
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xhr.send(
      JSON.stringify({
        status: "success",
        data: userData,
        statusData: statusData,
      })
    );
  } catch (e) {
    console.log(e);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/submit", true);
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xhr.send(
      JSON.stringify({
        status: "error",
        data: userData,
        error: JSON.stringify(e),
      })
    );
  }
}

function onSubmit() {
  const file = getSelectedFile();
  const reader = new FileReader();
  reader.addEventListener("load", () => createPdf(reader.result, file.type));
  reader.addEventListener("error", () => alert("Failed to read image file!"));
  reader.readAsArrayBuffer(file);
}

function onFileSelect() {
  const file = getSelectedFile();
  const shouldDisableButton = !file;

  const entryButton = document.getElementById("EntryButton");
  entryButton.disabled = shouldDisableButton;
}
