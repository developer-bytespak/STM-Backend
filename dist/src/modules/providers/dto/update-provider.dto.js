"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateProviderDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_provider_dto_1 = require("./create-provider.dto");
class UpdateProviderDto extends (0, swagger_1.PartialType)(create_provider_dto_1.CreateProviderDto) {
}
exports.UpdateProviderDto = UpdateProviderDto;
//# sourceMappingURL=update-provider.dto.js.map