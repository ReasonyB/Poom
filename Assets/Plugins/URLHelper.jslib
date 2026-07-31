mergeInto(LibraryManager.library, {
    // URL에서 ?room= 뒤에 있는 값을 가져와서 C#으로 넘겨주는 함수
    GetRoomIdFromURL: function () {
        var urlParams = new URLSearchParams(window.location.search);
        var roomId = urlParams.get('room'); // ?room= 값 추출

        if (roomId) {
            // 자바스크립트 문자열을 유니티가 읽을 수 있는 메모리 포인터로 변환
            var bufferSize = lengthBytesUTF8(roomId) + 1;
            var buffer = _malloc(bufferSize);
            stringToUTF8(roomId, buffer, bufferSize);
            return buffer;
        } else {
            return null; // 방 번호가 없으면 null 반환
        }
    },

    GetDevOpFromURL: function () {
        var urlParams = new URLSearchParams(window.location.search);
        window.isDevOp = urlParams.get('dev') === 'true'; // ?dev= 값 추출
        return window.isDevOp ? 1 : 0; // 유니티에서 bool로 인식할 수 있도록 1 또는 0 반환
    }
});