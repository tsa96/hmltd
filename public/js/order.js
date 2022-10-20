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

/**
 * @param {ArrayBuffer} imageArrayBuffer
 * @param {string} type
 * @returns {Promise<void>}
 */
async function createPdf(imageArrayBuffer, imageMimeType, type) {
  try {
    const url = `/pdf/${type}.pdf`;
    const pdfArrayBuffer = await fetch(url).then((res) => res.arrayBuffer());
    const pdfDoc = await PDFLib.PDFDocument.load(pdfArrayBuffer);
    const page = pdfDoc.getPages()[0];

    const font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);

    page.setFont(fontBold);
    page.setFontColor(PDFLib.rgb(0.9, 0.9, 0.9));

    // Sleepy 1am maths, this is probably wrong...
    const dynamicSize = (string, maxChars, idealSize) => {
      const chars = string.length;
      const minSize = idealSize / 2;
      const charScaleCutoff = maxChars * 1.5;

      // This should generally be the case.
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
      dobDate.getDay(),
      dobDate.getMonth() || Math.floor(Math.random() * 11) + 1, // why the FUCK is getMonth() sometimes 0?
      dobDate.getFullYear(),
    ].join("/");

    page.drawText(dob, {
      x: 400,
      y: 879,
      size: 28,
    });

    page.drawText(userData.birthplace, {
      x: 400,
      y: 799,
      size: dynamicSize(userData.birthplace, 20, 28),
    });

    page.drawText(userData.role, {
      x: 400,
      y: 718,
      size: dynamicSize(userData.role, 25, 28),
    });

    page.drawText(userData.bio, {
      x: 95,
      y: 420,
      size: 24,
      maxWidth: 610,
      font: font,
    });

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

    page.drawImage(image, { x: 100, y: 740, width: 240, height: 240 });

    const blob = new Blob([await pdfDoc.save()]);
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `TheOrder_ID_${userData.name.replace(" ", "")}.pdf`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 10000);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/submit", false);
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xhr.send(
      JSON.stringify({
        status: "success",
        data: userData,
      })
    );
  } catch (e) {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/submit", false);
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xhr.send(
      JSON.stringify({
        status: "error",
        data: userData,
        error: e,
      })
    );
  }
}

function onSubmit() {
  const file = getSelectedFile();
  const reader = new FileReader();
  // TODO: subj
  reader.addEventListener("load", () =>
    createPdf(reader.result, file.type, "auth")
  );
  reader.addEventListener("error", () => alert("Failed to read image file!"));
  reader.readAsArrayBuffer(file);
}

function onFileSelect() {
  const file = getSelectedFile();
  const shouldDisableButton = !file;

  const entryButton = document.getElementById("EntryButton");
  entryButton.disabled = shouldDisableButton;
}
