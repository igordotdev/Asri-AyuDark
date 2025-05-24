/**
 * Copyright (c) 2023 frostime. All rights reserved.
 * https://github.com/frostime/sy-plugin-template-vite
 *
 * See API Document in [API.md](https://github.com/siyuan-note/siyuan/blob/master/API.md)
 * API 文档见 [API_zh_CN.md](https://github.com/siyuan-note/siyuan/blob/master/API_zh_CN.md)
 */

import { fetchSyncPost, IWebSocketData } from "siyuan";

async function request(url: string, data: any) {
  let response: IWebSocketData = await fetchSyncPost(url, data);
  let res = response.code === 0 ? response.data : null;
  return res;
}

// **************************************** File ****************************************

export async function getFile(path: string): Promise<any> {
  let data = {
    path: path,
  };
  let url = "/api/file/getFile";
  try {
    let file = await fetchSyncPost(url, data);
    return file;
  } catch (error_msg) {
    return null;
  }
}

export async function putFile(path: string, isDir = false, file: any) {
  let form = new FormData();
  form.append("path", path);
  form.append("isDir", isDir.toString());
  // Copyright (c) 2023, terwer.
  // https://github.com/terwer/siyuan-plugin-importer/blob/v1.4.1/src/api/kernel-api.ts
  form.append("modTime", Math.floor(Date.now() / 1000).toString());
  form.append("file", file);
  let url = "/api/file/putFile";
  return request(url, form);
}

export async function removeFile(path: string) {
  let data = {
    path: path,
  };
  let url = "/api/file/removeFile";
  return request(url, data);
}

// **************************************** Attributes ****************************************
// export async function setBlockAttrs(id: string, attrs: { [key: string]: string }) {
//     let data = {
//         id: id,
//         attrs: attrs
//     }
//     let url = '/api/attr/setBlockAttrs';
//     return request(url, data);
// }

// export async function getBlockAttrs(id: string): Promise<{ [key: string]: string }> {
//     let data = {
//         id: id
//     }
//     let url = '/api/attr/getBlockAttrs';
//     return request(url, data);
// }
