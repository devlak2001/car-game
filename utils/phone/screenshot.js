import html2canvas from "html2canvas";
export function Screenshot(inputElement, outputElement = null) {
  //   document.querySelector(".envCamera").pause();
  html2canvas(inputElement, {
    width: document.querySelector(".envCamera").offsetWidth,
    height: document.querySelector(".envCamera").offsetHeight,
  }).then(function (canvas) {
    var img = canvas.toDataURL("image/png");

    // Create an <img> element and set its src attribute to the URL of the screenshot
    var image = new Image();
    image.src = img;
    image.className = "screenshot";
    // Add the <img> element to the page

    document.body.appendChild(image);
    if (
      navigator.share &&
      navigator.canShare &&
      navigator.canShare({ files: [dataURLtoFile(img, "screenshot.png")] })
    ) {
      navigator
        .share({
          files: [dataURLtoFile(img, "screenshot.png")],
        })
        .then(() => {
          document.querySelector(".debug").innerHTML = "des";
          if (outputElement) {
            outputElement.src = img;
          }
          console.log("Screenshot shared successfully");
        })
        .catch((error) => console.log("Sharing failed:", error));
    } else {
      var link = document.createElement("a");
      link.download = "screenshot.png";
      link.href = img;
      link.click();
    }
  });
}

const dataURLtoFile = (dataurl, filename) => {
  var arr = dataurl.split(","),
    mimeType = arr[0].match(/:(.*?);/)[1],
    decodedData = atob(arr[1]),
    lengthOfDecodedData = decodedData.length,
    u8array = new Uint8Array(lengthOfDecodedData);
  while (lengthOfDecodedData--) {
    u8array[lengthOfDecodedData] = decodedData.charCodeAt(lengthOfDecodedData);
  }
  return new File([u8array], filename, { type: mimeType });
};
