import EmailView from "./views/EmailView.vue";

function initMsgFileViewer() {
  if (!OCA.Viewer) {
    console.debug("OCA.Viewer not found. Cannot register msgfileviewer.");
    return;
  }

  const pdfHandler = OCA.Viewer.availableHandlers.find(
    (handler) => handler.id === "pdf"
  );
  if (!pdfHandler) {
    console.debug("No pdfHandler found. Cannot register msgfileviewer.");
    return;
  }

  OCA.Viewer.registerHandler({
    id: "msgfileviewer",
    mimes: ["application/vnd.ms-outlook"],
    component: EmailView,
    canCompare: false,
  });
}

initMsgFileViewer();
