/**
 * 여행 사이트의 "메모" 기능을 위한 Google Apps Script 백엔드.
 * 사용법은 저장소 루트 README.md의 "일정 메모 기능 설정" 항목을 참고하세요.
 *
 * 이 파일은 Google 스프레드시트의 확장 프로그램(Extensions) > Apps Script 편집기에
 * 그대로 붙여넣고 웹 앱으로 배포하는 용도입니다. (이 저장소 안에서 직접 실행되지 않습니다.)
 */

const SHEET_NAME = "notes";

function doGet(e) {
  const tripId = e.parameter.tripId || "";
  const sheet = getSheet_();
  const data = sheet.getDataRange().getValues();
  const result = {};
  for (let i = 1; i < data.length; i++) {
    const [rowTripId, itemId, note, updatedAt] = data[i];
    if (rowTripId === tripId && note) {
      result[itemId] = { note: note, updatedAt: updatedAt };
    }
  }
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const body = JSON.parse(e.postData.contents);
  const tripId = body.tripId;
  const itemId = body.itemId;
  const note = body.note || "";

  const sheet = getSheet_();
  const data = sheet.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === tripId && data[i][1] === itemId) {
      rowIndex = i + 1; // 시트는 1-based, 헤더 행 포함
      break;
    }
  }

  const now = new Date().toISOString();
  if (rowIndex > -1) {
    sheet.getRange(rowIndex, 3).setValue(note);
    sheet.getRange(rowIndex, 4).setValue(now);
  } else {
    sheet.appendRow([tripId, itemId, note, now]);
  }

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(["tripId", "itemId", "note", "updatedAt"]);
  }
  return sheet;
}
