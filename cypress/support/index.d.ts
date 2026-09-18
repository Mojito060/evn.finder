import type {} from 'cypress/types/net-stubbing';

declare global {
	namespace Cypress {
		interface Chainable<Subject = any> {
			/**
			 * Custom command to select DOM element by data-cy attribute.
			 * @example cy.dataCy('greeting')
			 */
			navigateToStation(
				value: string,
				options?: {
					findPrefix?: string;
				},
			): void;
			closeModal(): void;
			force404(): void;
		}
	}
}
